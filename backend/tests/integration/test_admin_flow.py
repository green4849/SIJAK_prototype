"""B7 운영자 화면: 운영자 역할 확인 · 신고·위험 대화 처리(기록 + 정지·제한 반영) · 돌봄 목록"""

import uuid
from datetime import UTC, datetime, timedelta

from httpx import AsyncClient
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.domains.admin.models import ModerationAction
from app.domains.auth.models import User
from app.domains.chat.models import ChatMessage, ChatRoom
from app.domains.wellbeing.models import RelationIndexWeek
from app.domains.wellbeing.service import KST
from tests.integration.helpers import signup_user

API = "/api/v1"


async def _operator(client: AsyncClient, sm: async_sessionmaker[AsyncSession]) -> dict:
    h, u = await signup_user(client, "박선희")
    async with sm() as s:
        await s.execute(update(User).where(User.id == uuid.UUID(u["id"])).values(role="operator"))
        await s.commit()
    return h


async def _risky_chat_and_report(client: AsyncClient) -> tuple[dict, dict, dict, dict]:
    """b 가 a 에게 돈 이야기 → 자동 감지 1건, a 가 그 메시지로 b 를 신고 → 신고 1건"""
    ha, a = await signup_user(client, "김영희")
    hb, b = await signup_user(client, "정덕수")
    await client.post(f"{API}/friends/requests", headers=ha, json={"to_user_id": b["id"]})
    await client.post(f"{API}/friends/requests", headers=hb, json={"to_user_id": a["id"]})
    rid = (await client.post(f"{API}/chats/with/{b['id']}", headers=ha)).json()["id"]
    msg = (
        await client.post(
            f"{API}/chats/{rid}/messages",
            headers=hb,
            json={"text": "급해요 병원비 때문에 계좌로 송금 좀 해 줄 수 있어요?"},
        )
    ).json()
    r = await client.post(
        f"{API}/safety/reports",
        headers=ha,
        json={"target_user_id": b["id"], "reason": "money", "message_id": msg["id"]},
    )
    assert r.status_code == 201, r.text
    return ha, a, hb, b


async def test_only_operators(
    client: AsyncClient, db_sessionmaker: async_sessionmaker[AsyncSession]
) -> None:
    h, _ = await signup_user(client, "김영희")
    for method, path in [
        ("GET", "/admin/cases"),
        ("GET", "/admin/watch"),
        ("GET", "/admin/cases/auto-1/context"),
        ("POST", "/admin/cases/auto-1/action"),
    ]:
        r = await client.request(method, f"{API}{path}", headers=h, json={"action": "warn"})
        assert r.status_code == 403, path
        assert r.json()["error"]["message"] == "운영자만 볼 수 있어요."
        assert (await client.request(method, f"{API}{path}")).status_code == 401

    hop = await _operator(client, db_sessionmaker)
    assert (await client.get(f"{API}/admin/cases", headers=hop)).json() == []
    assert (await client.get(f"{API}/admin/watch", headers=hop)).json() == []


async def test_cases_and_actions(
    client: AsyncClient, db_sessionmaker: async_sessionmaker[AsyncSession]
) -> None:
    hop = await _operator(client, db_sessionmaker)
    ha, a, hb, b = await _risky_chat_and_report(client)

    cases = (await client.get(f"{API}/admin/cases", headers=hop)).json()
    assert {c["source"] for c in cases} == {"auto", "report"}
    auto = next(c for c in cases if c["source"] == "auto")
    report = next(c for c in cases if c["source"] == "report")
    for c in cases:
        assert c["target_id"] == b["id"] and c["target_name"] == "정덕수"
        assert c["status"] == "open" and c["reports_count"] == 1
        assert c["excerpt"] == "급해요 병원비 때문에 계좌로 송금 좀 해 줄 수 있어요?"
        assert c["level"] == 3
    assert auto["id"].startswith("auto-") and report["id"].startswith("report-")
    assert auto["reasons"] == ["돈·송금 이야기", "급하게 서두르게 하는 말"]
    assert report["reasons"] == ["돈을 요구해요"]

    # 7일 정지 → 바로 로그인·이용 막힘
    r = await client.post(
        f"{API}/admin/cases/{report['id']}/action", headers=hop, json={"action": "suspend"}
    )
    assert r.status_code == 200, r.text
    assert r.json()["status"] == "suspended" and r.json()["id"] == report["id"]
    r = await client.get(f"{API}/me", headers=hb)
    assert r.status_code == 403 and r.json()["error"]["code"] == "user_suspended"
    assert "다시 쓸 수 있어요" in r.json()["error"]["message"]

    # 한 번 처리한 사건은 다시 처리하지 않는다
    r = await client.post(
        f"{API}/admin/cases/{report['id']}/action", headers=hop, json={"action": "ban"}
    )
    assert r.status_code == 409 and r.json()["error"]["message"] == "이미 처리한 신고예요."

    r = await client.post(
        f"{API}/admin/cases/{auto['id']}/action", headers=hop, json={"action": "dismiss"}
    )
    assert r.json()["status"] == "dismissed"

    # 처리 기록: 누가·무엇을
    async with db_sessionmaker() as s:
        rows = list(await s.scalars(select(ModerationAction).order_by(ModerationAction.id)))
    assert [(x.case_id, x.action) for x in rows] == [
        (report["id"], "suspend"),
        (auto["id"], "dismiss"),
    ]
    assert all(x.operator_id is not None and str(x.target_id) == b["id"] for x in rows)

    # 처리한 것은 아래로
    cases = (await client.get(f"{API}/admin/cases", headers=hop)).json()
    assert {c["status"] for c in cases} == {"suspended", "dismissed"}

    # 정지 기한이 지나면 다음 접속 때 풀린다
    async with db_sessionmaker() as s:
        await s.execute(
            update(User)
            .where(User.id == uuid.UUID(b["id"]))
            .values(suspended_until=datetime.now(UTC) - timedelta(minutes=1))
        )
        await s.commit()
    assert (await client.get(f"{API}/me", headers=hb)).status_code == 200


async def test_ban_and_errors(
    client: AsyncClient, db_sessionmaker: async_sessionmaker[AsyncSession]
) -> None:
    hop = await _operator(client, db_sessionmaker)
    _, _, hb, b = await _risky_chat_and_report(client)
    cases = (await client.get(f"{API}/admin/cases", headers=hop)).json()
    auto = next(c for c in cases if c["source"] == "auto")
    report = next(c for c in cases if c["source"] == "report")

    r = await client.post(
        f"{API}/admin/cases/{auto['id']}/action", headers=hop, json={"action": "ban"}
    )
    assert r.json()["status"] == "banned"
    # 영구 제한 뒤 '7일 정지'가 와도 더 가벼워지지 않는다
    await client.post(
        f"{API}/admin/cases/{report['id']}/action", headers=hop, json={"action": "suspend"}
    )
    r = await client.get(f"{API}/me", headers=hb)
    assert r.status_code == 403 and r.json()["error"]["code"] == "user_banned"

    for bad in ("auto-999999", "report-nope", f"report-{uuid.uuid4()}", "x-1"):
        r = await client.post(
            f"{API}/admin/cases/{bad}/action", headers=hop, json={"action": "warn"}
        )
        assert r.status_code == 404 and r.json()["error"]["message"] == "없는 신고예요."
    r = await client.post(
        f"{API}/admin/cases/{auto['id']}/action", headers=hop, json={"action": "delete"}
    )
    assert r.status_code == 422


async def test_watch_list(
    client: AsyncClient, db_sessionmaker: async_sessionmaker[AsyncSession]
) -> None:
    hop = await _operator(client, db_sessionmaker)
    hc, c = await signup_user(client, "최말순", birth="1950-01-01")
    _, d = await signup_user(client, "윤옥자")
    _, e = await signup_user(client, "강기철")
    _, f = await signup_user(client, "정상희")
    await client.post(f"{API}/emergency/sos", headers=hc)

    today = datetime.now(KST).date()
    this_week = today - timedelta(days=today.weekday())
    rows = [
        (c, this_week, 18),
        (c, this_week - timedelta(weeks=1), 30),
        (d, this_week, 52),
        (e, this_week - timedelta(weeks=1), 36),
        (f, this_week, 85),  # 정상 → 빠짐
    ]
    async with db_sessionmaker() as s:
        for u, week, score in rows:
            s.add(RelationIndexWeek(user_id=uuid.UUID(u["id"]), week_start=week, score=score))
        await s.execute(
            update(User)
            .where(User.id == uuid.UUID(e["id"]))
            .values(last_login_at=datetime.now(UTC) - timedelta(days=8))
        )
        await s.commit()

    out = (await client.get(f"{API}/admin/watch", headers=hop)).json()
    assert [w["name"] for w in out] == ["최말순", "강기철", "윤옥자"]  # 낮은 순
    w = out[0]
    assert w["relation_score"] == 18 and w["region_name"] == "경기도"
    assert w["age"] >= 75 and w["last_seen_text"] == "오늘"
    assert w["signal"] == "지난주보다 12점 내려갔어요"
    assert w["guardian_notified"] is True
    assert out[1]["signal"] == "8일째 접속이 없어요" and out[1]["last_seen_text"] == "8일 전"
    assert out[1]["guardian_notified"] is False
    assert out[2]["signal"] == "사회적 관계 지수가 '주의' 단계예요"


async def test_case_context_is_bounded_to_reported_room(
    client: AsyncClient, db_sessionmaker: async_sessionmaker[AsyncSession]
) -> None:
    hop = await _operator(client, db_sessionmaker)
    ha, a, hb, b = await _risky_chat_and_report(client)
    cases = (await client.get(f"{API}/admin/cases", headers=hop)).json()
    report = next(c for c in cases if c["source"] == "report")
    async with db_sessionmaker() as session:
        room = await session.scalar(select(ChatRoom))
        assert room is not None
        session.add_all(
            [
                ChatMessage(
                    room_id=room.id, sender_id=uuid.UUID(a["id"]), kind="text", body=f"뒤 대화 {i}"
                )
                for i in range(7)
            ]
        )
        await session.commit()
    # 별도 방의 메시지는 맥락에 나오면 안 된다.
    hc, c = await signup_user(client, "다른이웃")
    await client.post(f"{API}/friends/requests", headers=ha, json={"to_user_id": c["id"]})
    await client.post(f"{API}/friends/requests", headers=hc, json={"to_user_id": a["id"]})
    other = (await client.post(f"{API}/chats/with/{c['id']}", headers=ha)).json()["id"]
    await client.post(f"{API}/chats/{other}/messages", headers=ha, json={"text": "다른 방 비밀"})
    r = await client.get(f"{API}/admin/cases/{report['id']}/context", headers=hop)
    assert r.status_code == 200
    rows = r.json()
    assert len(rows) == 6
    assert rows[0]["is_reported"] and rows[0]["sender_name"] == "정덕수"
    assert [m["body"] for m in rows[1:]] == [f"뒤 대화 {i}" for i in range(5)]
    assert all("audio_key" not in m and "room_id" not in m for m in rows)
    assert (
        await client.get(f"{API}/admin/cases/auto-999999/context", headers=hop)
    ).status_code == 404
