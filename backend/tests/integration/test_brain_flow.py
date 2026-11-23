"""C13 두뇌 운동 기록 — 연속 일수·이번 주·최고 기록 (한국 날짜 기준)"""

import uuid
from datetime import datetime, time, timedelta

from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.domains.brain.models import BrainResult
from app.domains.brain.service import KST, kst_today
from tests.integration.helpers import signup_user

API = "/api/v1"


async def _played(
    sm: async_sessionmaker[AsyncSession], user_id: str, days_ago: int, game: str = "calc"
) -> None:
    """days_ago 일 전(한국 날짜) 아침 9시에 한 판"""
    at = datetime.combine(kst_today() - timedelta(days=days_ago), time(9), tzinfo=KST)
    async with sm() as s:
        s.add(BrainResult(user_id=uuid.UUID(user_id), game=game, score=4, total=5, created_at=at))
        await s.commit()


async def test_empty_stats(client: AsyncClient) -> None:
    h, _ = await signup_user(client, "김영희")
    r = await client.get(f"{API}/brain/stats", headers=h)
    assert r.status_code == 200
    assert r.json() == {"streak_days": 0, "today_done": False, "week": [False] * 7, "best": []}


async def test_streak_continues_from_yesterday_until_today(
    client: AsyncClient, db_sessionmaker: async_sessionmaker[AsyncSession]
) -> None:
    h, me = await signup_user(client, "김영희")
    # 어제까지 사흘 연속, 그 전 하루 빔, 닷새 전 한 판 (데모 시드와 같은 흐름)
    for d in (1, 2, 3, 5):
        await _played(db_sessionmaker, me["id"], d)

    s = (await client.get(f"{API}/brain/stats", headers=h)).json()
    assert s["streak_days"] == 3 and s["today_done"] is False

    r = await client.post(
        f"{API}/brain/results", headers=h, json={"game": "calc", "score": 5, "total": 5}
    )
    assert r.status_code == 201
    s = r.json()
    assert s["streak_days"] == 4 and s["today_done"] is True
    # 이번 주: 오늘은 표시, 월요일 이전 날은 넣지 않는다
    today = kst_today()
    assert len(s["week"]) == 7 and s["week"][today.weekday()] is True
    played = {today - timedelta(days=d) for d in (0, 1, 2, 3, 5)}
    monday = today - timedelta(days=today.weekday())
    assert s["week"] == [monday + timedelta(days=i) in played for i in range(7)]


async def test_best_records(client: AsyncClient) -> None:
    h, _ = await signup_user(client, "김영희")

    async def post(game: str, score: int, total: int) -> dict:
        r = await client.post(
            f"{API}/brain/results", headers=h, json={"game": game, "score": score, "total": total}
        )
        assert r.status_code == 201, r.text
        return r.json()

    await post("match", 14, 4)
    await post("match", 9, 4)
    await post("calc", 3, 5)
    s = await post("calc", 5, 5)
    assert s["best"] == [
        {"game": "match", "text": "가장 적게 뒤집은 횟수 9번"},
        {"game": "calc", "text": "가장 많이 맞힌 문제 5개"},
    ]
    # 하루에 여러 판 해도 연속 일수는 하루
    assert s["streak_days"] == 1


async def test_invalid_results(client: AsyncClient) -> None:
    h, _ = await signup_user(client, "김영희")

    async def post(body: dict) -> int:
        return (await client.post(f"{API}/brain/results", headers=h, json=body)).status_code

    assert await post({"game": "chess", "score": 1, "total": 1}) == 422
    assert await post({"game": "calc", "score": 6, "total": 5}) == 422
    assert await post({"game": "match", "score": 3, "total": 4}) == 422
    assert await post({"game": "calc", "score": -1, "total": 5}) == 422
    assert (await client.get(f"{API}/brain/stats")).status_code == 401
    # 다른 사람 기록과 섞이지 않는다
    hb, _ = await signup_user(client, "이순자")
    await client.post(
        f"{API}/brain/results", headers=hb, json={"game": "calc", "score": 5, "total": 5}
    )
    assert (await client.get(f"{API}/brain/stats", headers=h)).json()["best"] == []
