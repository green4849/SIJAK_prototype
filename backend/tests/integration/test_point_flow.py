"""C12 포인트·추천 평가·미션·봉사·대화 주제·알림 설정"""

from collections.abc import Iterator
from datetime import UTC, date, datetime, timedelta

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.core.config import get_settings
from app.domains.activity.models import Activity
from tests.integration.helpers import signup_user

API = "/api/v1"


@pytest.fixture
def free_period() -> Iterator[None]:
    """체험 기간 켜기 (설정은 캐시된 객체라 직접 바꾸고 되돌린다)"""
    settings = get_settings()
    settings.point_free_until = date(2099, 12, 31)
    yield
    settings.point_free_until = None


async def _balance(client: AsyncClient, h: dict) -> int:
    return (await client.get(f"{API}/points", headers=h)).json()["balance"]


async def _request(client: AsyncClient, h: dict, to: dict) -> int:
    r = await client.post(f"{API}/friends/requests", headers=h, json={"to_user_id": to["id"]})
    return r.status_code


async def _make_friends_and_talk(client: AsyncClient, ha: dict, a: dict, name: str) -> None:
    hb, b = await signup_user(client, name)
    await client.post(f"{API}/friends/requests", headers=hb, json={"to_user_id": a["id"]})
    await client.post(f"{API}/friends/requests", headers=ha, json={"to_user_id": b["id"]})
    room = (await client.post(f"{API}/chats/with/{b['id']}", headers=ha)).json()
    await client.post(f"{API}/chats/{room['id']}/messages", headers=ha, json={"text": "안녕하세요"})
    await client.post(f"{API}/chats/{room['id']}/messages", headers=hb, json={"text": "반가워요"})


# ---------- 포인트: 가입 보너스·친구 신청 비용 ----------


async def test_friend_request_costs_points(client: AsyncClient) -> None:
    ha, _ = await signup_user(client, "김영희")
    others = [(await signup_user(client, f"이웃{i}"))[1] for i in range(5)]

    s = (await client.get(f"{API}/points", headers=ha)).json()
    assert s["balance"] == 100 and s["next_request_free"] is True
    assert s["friend_request_cost"] == 30

    # 첫 신청은 무료, 그다음부터 30P
    assert await _request(client, ha, others[0]) == 201
    assert await _balance(client, ha) == 100
    assert (await client.get(f"{API}/points", headers=ha)).json()["next_request_free"] is False
    assert await _request(client, ha, others[1]) == 201
    assert await _balance(client, ha) == 70

    # 같은 사람에게 다시 신청해도 다시 내지 않는다 (중복·거절 후 재신청)
    assert await _request(client, ha, others[1]) == 201
    assert await _balance(client, ha) == 70

    assert await _request(client, ha, others[2]) == 201
    assert await _request(client, ha, others[3]) == 201
    assert await _balance(client, ha) == 10

    # 모자라면 402 — 신청도 저장되지 않는다
    r = await client.post(
        f"{API}/friends/requests", headers=ha, json={"to_user_id": others[4]["id"]}
    )
    assert r.status_code == 402 and r.json()["error"]["code"] == "insufficient_points"
    assert await _balance(client, ha) == 10

    history = (await client.get(f"{API}/points/history", headers=ha)).json()
    assert [(e["reason"], e["amount"]) for e in history][-2:] == [
        ("friend_request", 0),
        ("welcome", 100),
    ]
    assert history[0]["label"] == "이웃3님께 친구 신청"


async def test_accepting_and_mutual_request_are_free(client: AsyncClient) -> None:
    ha, a = await signup_user(client, "김영희")
    hb, b = await signup_user(client, "박철수")
    hc, _ = await signup_user(client, "이순자")
    await _request(client, hc, a)  # 이순자의 첫 신청(무료)을 써 둔다
    await _request(client, hb, a)
    # 받은 신청에 맞신청 → 바로 친구, 포인트 없음 (첫 무료도 아껴 둔다)
    assert await _request(client, ha, b) == 201
    s = (await client.get(f"{API}/points", headers=ha)).json()
    assert s["balance"] == 100 and s["next_request_free"] is True


async def test_free_period(client: AsyncClient, free_period: None) -> None:
    ha, _ = await signup_user(client, "김영희")
    for i in range(3):
        _, other = await signup_user(client, f"이웃{i}")
        assert await _request(client, ha, other) == 201
    s = (await client.get(f"{API}/points", headers=ha)).json()
    assert s["balance"] == 100 and s["free_until"] == "2099-12-31"


# ---------- 추천 평가 ----------


async def test_rating_reorders_and_rewards(client: AsyncClient) -> None:
    ha, _ = await signup_user(client, "김영희", interests=["walking", "music"])
    _, b = await signup_user(client, "박철수", interests=["walking", "music"])  # 원래 1순위
    _, c = await signup_user(client, "이순자", interests=["cooking"])
    _, d = await signup_user(client, "최말순", interests=["tv"])

    rec = (await client.get(f"{API}/friends/recommendations", headers=ha)).json()
    assert rec[0]["name"] == "박철수" and rec[0]["my_rating"] is None

    r = await client.put(
        f"{API}/friends/recommendations/{c['id']}/rating", headers=ha, json={"rating": "like"}
    )
    assert r.json() == {"rating": "like", "points_earned": 10, "ratings_left_today": 4}
    await client.put(
        f"{API}/friends/recommendations/{b['id']}/rating", headers=ha, json={"rating": "dislike"}
    )
    await client.put(
        f"{API}/friends/recommendations/{d['id']}/rating", headers=ha, json={"rating": "neutral"}
    )

    # 만나보고 싶어요 → 맨 앞, 그저 그래요 → 뒤, 잘 안 맞아요 → 빠짐
    rec = (await client.get(f"{API}/friends/recommendations", headers=ha)).json()
    assert [(x["name"], x["my_rating"]) for x in rec] == [("이순자", "like"), ("최말순", "neutral")]
    assert await _balance(client, ha) == 130

    # 평가를 바꿔도 포인트는 한 번
    again = await client.put(
        f"{API}/friends/recommendations/{c['id']}/rating", headers=ha, json={"rating": "neutral"}
    )
    assert again.json()["points_earned"] == 0
    assert await _balance(client, ha) == 130

    # 평가는 상대에게 보이지 않는다
    hc_rec = await client.get(f"{API}/friends/recommendations", headers=ha)
    assert all("rated_by" not in x for x in hc_rec.json())


async def test_rating_daily_limit(client: AsyncClient) -> None:
    ha, _ = await signup_user(client, "김영희")
    earned = []
    for i in range(6):
        _, u = await signup_user(client, f"이웃{i}")
        r = await client.put(
            f"{API}/friends/recommendations/{u['id']}/rating", headers=ha, json={"rating": "like"}
        )
        earned.append(r.json()["points_earned"])
    assert earned == [10, 10, 10, 10, 10, 0]
    assert (await client.get(f"{API}/points", headers=ha)).json()["ratings_left_today"] == 0


async def test_cannot_rate_self(client: AsyncClient) -> None:
    ha, a = await signup_user(client, "김영희")
    r = await client.put(
        f"{API}/friends/recommendations/{a['id']}/rating", headers=ha, json={"rating": "like"}
    )
    assert r.status_code == 400


# ---------- 미션: 첫 친구 3명 ----------


async def test_first_friends_mission(client: AsyncClient) -> None:
    ha, a = await signup_user(client, "김영희")

    m = (await client.get(f"{API}/missions", headers=ha)).json()[0]
    assert (m["code"], m["progress"], m["goal"], m["done"]) == ("first_friends", 0, 3, False)

    # 친구가 됐어도 대화를 주고받지 않았으면 세지 않는다
    _, b = await signup_user(client, "말없는이웃")
    await _request(client, ha, b)
    await _make_friends_and_talk(client, ha, a, "박철수")
    await _make_friends_and_talk(client, ha, a, "이순자")
    m = (await client.get(f"{API}/missions", headers=ha)).json()[0]
    assert m["progress"] == 2
    early = await client.post(f"{API}/missions/first_friends/claim", headers=ha)
    assert early.status_code == 400 and early.json()["error"]["code"] == "mission_not_done"

    await _make_friends_and_talk(client, ha, a, "최말순")
    before = await _balance(client, ha)
    m = (await client.post(f"{API}/missions/first_friends/claim", headers=ha)).json()
    assert m["claimed"] is True and m["progress"] == 3
    assert await _balance(client, ha) == before + 500
    # 두 번 받지 않는다
    await client.post(f"{API}/missions/first_friends/claim", headers=ha)
    assert await _balance(client, ha) == before + 500


# ---------- 봉사모임 ----------


async def test_volunteer_reward_and_cancel(
    client: AsyncClient, db_sessionmaker: async_sessionmaker[AsyncSession]
) -> None:
    soon = datetime.now(UTC) + timedelta(days=3)
    rows = [
        Activity(
            title="도시락 나눔",
            category="volunteer",
            region_code="41",
            place="복지관",
            schedule_text="토 10시",
            starts_at=soon,
            ends_at=soon + timedelta(hours=2),
            capacity=10,
        ),
        Activity(
            title="건강 걷기",
            category="health",
            region_code="41",
            place="공원",
            schedule_text="화 10시",
            starts_at=soon,
            ends_at=soon + timedelta(hours=1),
            capacity=10,
        ),
    ]
    async with db_sessionmaker() as s:
        s.add_all(rows)
        await s.commit()
        vol, walk = str(rows[0].id), str(rows[1].id)

    ha, _ = await signup_user(client, "김영희")
    cats = (await client.get(f"{API}/activities/categories")).json()
    assert {"code": "volunteer", "label": "봉사"} in cats
    listed = (await client.get(f"{API}/activities?category=volunteer", headers=ha)).json()
    assert [(x["title"], x["reward_points"]) for x in listed] == [("도시락 나눔", 100)]

    await client.post(f"{API}/activities/{walk}/application", headers=ha)
    assert await _balance(client, ha) == 100  # 봉사가 아니면 포인트 없음
    await client.post(f"{API}/activities/{vol}/application", headers=ha)
    await client.post(f"{API}/activities/{vol}/application", headers=ha)  # 두 번 눌러도 한 번
    assert await _balance(client, ha) == 200
    history = (await client.get(f"{API}/points/history", headers=ha)).json()
    assert history[0]["label"] == "도시락 나눔" and history[0]["reason"] == "volunteer"

    # 취소하면 회수
    await client.delete(f"{API}/activities/{vol}/application", headers=ha)
    assert await _balance(client, ha) == 100


# ---------- 대화 주제 ----------


async def test_topic_suggestions(client: AsyncClient) -> None:
    ha, a = await signup_user(client, "김영희", interests=["walking", "music"])
    hb, b = await signup_user(client, "박철수", interests=["tv", "walking"])
    await _request(client, ha, b)
    await _request(client, hb, a)
    room = (await client.post(f"{API}/chats/with/{b['id']}", headers=ha)).json()

    topics = (await client.get(f"{API}/chats/{room['id']}/topics", headers=ha)).json()
    assert len(topics) == 4
    # 공통 관심사(산책) 먼저, 그다음 상대 관심사(TV)
    assert topics[0] == {
        "label": "산책·등산",
        "text": "자주 가시는 산책길이 있으세요?",
        "common": True,
    }
    assert topics[1]["label"] == "TV·드라마" and topics[1]["common"] is False

    # 방에 없는 사람은 못 본다
    hc, _ = await signup_user(client, "이순자")
    r = await client.get(f"{API}/chats/{room['id']}/topics", headers=hc)
    assert r.status_code == 404


# ---------- 알림 설정 ----------


async def test_notification_settings(client: AsyncClient) -> None:
    ha, _ = await signup_user(client, "김영희")
    s = (await client.get(f"{API}/notifications/settings", headers=ha)).json()
    assert s["recommend_enabled"] is True
    assert s["recommend_times"] == ["morning", "evening"]
    assert s["max_per_day"] == 2
    assert [o["code"] for o in s["time_options"]] == ["morning", "noon", "evening"]

    url = f"{API}/notifications/settings"
    ok = await client.put(
        url, headers=ha, json={"recommend_enabled": True, "recommend_times": ["evening", "noon"]}
    )
    assert ok.json()["recommend_times"] == ["noon", "evening"]  # 시간 순으로

    too_many = await client.put(
        url,
        headers=ha,
        json={"recommend_enabled": True, "recommend_times": ["morning", "noon", "evening"]},
    )
    assert too_many.status_code == 422
    none = await client.put(
        url, headers=ha, json={"recommend_enabled": True, "recommend_times": []}
    )
    assert none.status_code == 422

    off = await client.put(
        url, headers=ha, json={"recommend_enabled": False, "recommend_times": []}
    )
    assert off.json()["recommend_enabled"] is False
    assert (await client.get(url, headers=ha)).json()["recommend_enabled"] is False
