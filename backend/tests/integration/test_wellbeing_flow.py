"""C11 사회적 관계 지수(데모 계산과 같은 공식) · 주간 기록 · 자가평가(PHQ-9·GAD-7·WHO-5)"""

import uuid
from datetime import UTC, datetime, timedelta

from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.domains.activity.models import Activity
from app.domains.wellbeing.models import RelationIndexWeek, SelfAssessment
from app.domains.wellbeing.service import KST
from tests.integration.helpers import signup_user

API = "/api/v1"


async def _index(client: AsyncClient, h: dict) -> dict:
    r = await client.get(f"{API}/me/relation-index", headers=h)
    assert r.status_code == 200, r.text
    return r.json()


async def test_new_user_index(client: AsyncClient) -> None:
    h, _ = await signup_user(client, "김영희")
    out = await _index(client, h)
    # 방금 접속(A=100), 대화·친구 없음(C=S=0), 마음·답장 기본 70
    # 0.25·100 + 0.30·0 + 0.20·70 + 0.15·0 + 0.10·70 = 46
    assert out["score"] == 46 and out["level"] == "caution"
    assert out["factors"] == [
        {"code": "activity", "label": "앱 활동", "score": 100},
        {"code": "communication", "label": "대화", "score": 0},
        {"code": "emotion", "label": "마음", "score": 70},
        {"code": "social", "label": "이웃 만남", "score": 0},
        {"code": "responsiveness", "label": "답장", "score": 70},
    ]
    assert out["weekly"] == [{"label": "이번 주", "score": 46}]
    assert out["mood"] == {"level": "none", "talked": 0, "heavy": 0, "crisis": False}
    assert out["updated_at"]
    assert (await client.get(f"{API}/me/relation-index")).status_code == 401


async def test_index_rises_with_friends_talk_and_activities(
    client: AsyncClient, db_sessionmaker: async_sessionmaker[AsyncSession]
) -> None:
    ha, a = await signup_user(client, "김영희")
    hb, b = await signup_user(client, "이순자")
    await client.post(f"{API}/friends/requests", headers=ha, json={"to_user_id": b["id"]})
    await client.post(f"{API}/friends/requests", headers=hb, json={"to_user_id": a["id"]})
    rid = (await client.post(f"{API}/chats/with/{b['id']}", headers=ha)).json()["id"]
    for text in ("안녕하세요", "산책 가실래요?", "내일 봬요"):
        await client.post(f"{API}/chats/{rid}/messages", headers=ha, json={"text": text})
    # 상대가 한 말은 내 '대화'에 넣지 않는다
    await client.post(f"{API}/chats/{rid}/messages", headers=hb, json={"text": "좋아요"})

    soon = datetime.now(UTC) + timedelta(days=3)
    async with db_sessionmaker() as s:
        act = Activity(
            title="건강 걷기",
            category="health",
            region_code="41",
            place="공원",
            schedule_text="화 10시",
            starts_at=soon,
            ends_at=soon + timedelta(hours=1),
            capacity=10,
        )
        s.add(act)
        await s.commit()
        aid = act.id
    await client.post(f"{API}/activities/{aid}/application", headers=ha)

    out = await _index(client, ha)
    f = {x["code"]: x["score"] for x in out["factors"]}
    assert f["communication"] == 36  # 3 × 12
    assert f["social"] == 35  # 친구 1 × 20 + 활동 1 × 15
    # 25 + 10.8 + 14 + 5.25 + 7 = 62.05
    assert out["score"] == 62 and out["level"] == "caution"


async def test_weekly_history(
    client: AsyncClient, db_sessionmaker: async_sessionmaker[AsyncSession]
) -> None:
    h, me = await signup_user(client, "김영희")
    today = datetime.now(KST).date()
    this_week = today - timedelta(days=today.weekday())
    async with db_sessionmaker() as s:
        for weeks_ago, score in [(5, 30), (3, 42), (2, 49), (1, 56)]:
            s.add(
                RelationIndexWeek(
                    user_id=uuid.UUID(me["id"]),
                    week_start=this_week - timedelta(weeks=weeks_ago),
                    score=score,
                )
            )
        await s.commit()

    out = await _index(client, h)
    assert out["weekly"] == [
        {"label": "3주 전", "score": 42},
        {"label": "2주 전", "score": 49},
        {"label": "1주 전", "score": 56},
        {"label": "이번 주", "score": 46},
    ]
    # 같은 주에 다시 봐도 이번 주 값은 하나 (덮어 쓴다)
    out = await _index(client, h)
    assert len(out["weekly"]) == 4


async def test_self_assessment(client: AsyncClient) -> None:
    h, _ = await signup_user(client, "김영희")

    form = (await client.get(f"{API}/me/self-assessment/phq9", headers=h)).json()
    assert form["kind"] == "phq9" and form["title"] == "기분 점검"
    assert form["lead"] == "지난 2주 동안 이런 일이 얼마나 있었나요?"
    assert [q["id"] for q in form["questions"]] == list(range(1, 10))
    assert [o["value"] for o in form["options"]] == [0, 1, 2, 3]
    gad = (await client.get(f"{API}/me/self-assessment/gad7", headers=h)).json()
    assert len(gad["questions"]) == 7
    r = await client.get(f"{API}/me/self-assessment/mmse", headers=h)
    assert r.status_code == 404 and r.json()["error"]["message"] == "없는 점검이에요."

    assert (await client.get(f"{API}/me/self-assessment", headers=h)).json() == []

    r = await client.post(
        f"{API}/me/self-assessment", headers=h, json={"kind": "phq9", "answers": [1] * 9}
    )
    assert r.status_code == 201, r.text
    res = r.json()
    assert res["score"] == 9 and res["max_score"] == 27
    assert res["level"] == "mild" and res["level_label"] == "조금 지쳐 있어요"
    assert res["crisis"] is True  # 9번에 '며칠 있었어요'
    assert res["title"] == "기분 점검" and res["id"] and res["created_at"]

    r = await client.post(
        f"{API}/me/self-assessment", headers=h, json={"kind": "gad7", "answers": [3] * 7}
    )
    res2 = r.json()
    assert res2["score"] == 21 and res2["max_score"] == 21
    assert res2["level"] == "severe" and res2["crisis"] is False
    assert "109" in res2["advice"]

    r = await client.post(
        f"{API}/me/self-assessment", headers=h, json={"kind": "phq9", "answers": [0] * 9}
    )
    assert r.json()["level"] == "minimal" and r.json()["crisis"] is False

    hist = (await client.get(f"{API}/me/self-assessment", headers=h)).json()
    assert [x["kind"] for x in hist] == ["phq9", "gad7", "phq9"]  # 새것부터


async def test_self_assessment_validation(client: AsyncClient) -> None:
    h, _ = await signup_user(client, "김영희")

    async def post(body: dict) -> tuple[int, dict]:
        r = await client.post(f"{API}/me/self-assessment", headers=h, json=body)
        return r.status_code, r.json()

    code, body = await post({"kind": "phq9", "answers": [0] * 8})
    assert code == 422 and body["error"]["message"] == "모든 질문에 답해 주세요."
    code, body = await post({"kind": "gad7", "answers": [0, 1, 2, 3, 4, 0, 0]})
    assert code == 422 and body["error"]["message"] == "모든 질문에 답해 주세요."
    code, _ = await post({"kind": "mmse", "answers": [0] * 9})
    assert code == 422
    # 다른 사람 결과는 보이지 않는다
    hb, _ = await signup_user(client, "이순자")
    await client.post(
        f"{API}/me/self-assessment", headers=hb, json={"kind": "gad7", "answers": [0] * 7}
    )
    assert (await client.get(f"{API}/me/self-assessment", headers=h)).json() == []


async def test_who5_score_levels_and_previous(client: AsyncClient) -> None:
    """WHO-5: 합 × 4 = 0~100 (높을수록 좋음), 구간 66~100 · 51~65 · 0~50, 28 이하 상담 안내"""
    h, _ = await signup_user(client, "김영희")

    form = (await client.get(f"{API}/me/self-assessment/who5", headers=h)).json()
    assert form["kind"] == "who5" and form["title"] == "마음 건강 살펴보기"
    assert len(form["questions"]) == 5
    assert form["questions"][0]["text"] == "지난 2주간 나는 밝고 기분이 좋았다"
    assert [o["value"] for o in form["options"]] == [0, 1, 2, 3, 4, 5]
    assert [o["label"] for o in form["options"]] == [
        "전혀 없음", "가끔", "절반 미만", "절반 이상", "대부분", "항상"
    ]  # fmt: skip

    async def submit(answers: list[int]) -> dict:
        r = await client.post(
            f"{API}/me/self-assessment", headers=h, json={"kind": "who5", "answers": answers}
        )
        assert r.status_code == 201, r.text
        return r.json()

    first = await submit([3, 3, 2, 3, 2])  # 13 × 4 = 52
    assert first["score"] == 52 and first["max_score"] == 100
    assert first["level"] == "fair" and first["crisis"] is False
    assert first["previous_score"] is None

    second = await submit([4, 3, 3, 3, 4])  # 17 × 4 = 68
    assert second["score"] == 68 and second["level"] == "good"
    assert second["previous_score"] == 52

    # 다른 점검은 WHO-5 '지난번'에 끼지 않는다
    await client.post(
        f"{API}/me/self-assessment", headers=h, json={"kind": "phq9", "answers": [0] * 9}
    )
    third = await submit([1, 1, 1, 2, 2])  # 7 × 4 = 28
    assert third["score"] == 28 and third["level"] == "low" and third["crisis"] is True
    assert third["previous_score"] == 68
    assert (await submit([2, 2, 2, 3, 4]))["score"] == 52  # 50 초과 → fair 경계 확인용
    assert (await submit([2, 2, 2, 3, 3]))["level"] == "low"  # 48

    hist = (await client.get(f"{API}/me/self-assessment", headers=h)).json()
    who5 = [(x["score"], x["previous_score"]) for x in hist if x["kind"] == "who5"]
    assert who5 == [(48, 52), (52, 28), (28, 68), (68, 52), (52, None)]
    phq = next(x for x in hist if x["kind"] == "phq9")
    assert phq["previous_score"] is None

    # WHO-5는 0~5만, PHQ-9는 여전히 0~3만
    r = await client.post(
        f"{API}/me/self-assessment", headers=h, json={"kind": "who5", "answers": [6, 0, 0, 0, 0]}
    )
    assert r.status_code == 422
    r = await client.post(
        f"{API}/me/self-assessment", headers=h, json={"kind": "phq9", "answers": [4] + [0] * 8}
    )
    assert r.status_code == 422


async def test_who5_due_every_four_weeks(
    client: AsyncClient, db_sessionmaker: async_sessionmaker[AsyncSession]
) -> None:
    h, _ = await signup_user(client, "김영희")

    async def status() -> dict:
        r = await client.get(f"{API}/me/who5", headers=h)
        assert r.status_code == 200, r.text
        return r.json()

    async def who5_notices() -> list[dict]:
        items = (await client.get(f"{API}/notifications", headers=h)).json()
        return [n for n in items if n["title"] == "마음 건강 살펴볼 때예요"]

    # 가입하고 아직 안 했으면 바로 할 때 — 알림은 쌓지 않는다 (홈 카드로 권함)
    assert await status() == {"last": None, "next_due_at": None, "due": True}
    assert await who5_notices() == []
    assert (await client.get(f"{API}/me/who5")).status_code == 401

    r = await client.post(
        f"{API}/me/self-assessment", headers=h, json={"kind": "who5", "answers": [3] * 5}
    )
    st = await status()
    assert st["due"] is False and st["last"]["score"] == 60
    created = datetime.fromisoformat(r.json()["created_at"])
    assert datetime.fromisoformat(st["next_due_at"]) == created + timedelta(days=28)

    # 4주가 지나면 할 때 + 알림 한 번 (다시 불러도 한 번)
    async with db_sessionmaker() as s:
        a = await s.get(SelfAssessment, r.json()["id"])
        assert a is not None
        a.created_at = datetime.now(UTC) - timedelta(days=28, minutes=1)
        await s.commit()
    assert (await status())["due"] is True
    await status()
    notices = await who5_notices()
    assert len(notices) == 1
    assert notices[0]["link"] == "/me/wellbeing/check/who5"

    # 다시 하면 다음 4주까지는 할 때가 아니다
    await client.post(
        f"{API}/me/self-assessment", headers=h, json={"kind": "who5", "answers": [4] * 5}
    )
    st = await status()
    assert st["due"] is False and st["last"]["previous_score"] == 60
