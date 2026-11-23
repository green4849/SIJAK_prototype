"""알림함 (C4 일부): 친구 신청·친구 됨·위험 대화·활동 신청이 쌓이고, 읽음·모두 읽음"""

from datetime import UTC, datetime, timedelta

from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.domains.activity.models import Activity
from tests.integration.helpers import signup_user

API = "/api/v1"


async def _inbox(client: AsyncClient, h: dict) -> list[dict]:
    r = await client.get(f"{API}/notifications", headers=h)
    assert r.status_code == 200, r.text
    return r.json()


async def test_friend_request_and_accept(client: AsyncClient) -> None:
    ha, a = await signup_user(client, "김영희")
    hb, b = await signup_user(client, "박정호")
    assert await _inbox(client, ha) == []

    await client.post(f"{API}/friends/requests", headers=hb, json={"to_user_id": a["id"]})
    # 같은 사람이 다시 눌러도 한 번만
    await client.post(f"{API}/friends/requests", headers=hb, json={"to_user_id": a["id"]})
    items = await _inbox(client, ha)
    assert len(items) == 1
    n = items[0]
    assert n["kind"] == "friend" and n["title"] == "새 친구 신청"
    assert n["body"] == "박정호님이 친구 신청을 보냈어요"
    assert n["link"] == "/friends" and n["read"] is False
    assert n["id"] and n["created_at"]
    assert await _inbox(client, hb) == []  # 보낸 사람에게는 없음

    req_id = (await client.get(f"{API}/friends/requests", headers=ha)).json()[0]["request_id"]
    assert (
        await client.post(f"{API}/friends/requests/{req_id}/accept", headers=ha)
    ).status_code == 204
    items = await _inbox(client, hb)
    assert [(x["title"], x["body"]) for x in items] == [
        ("친구가 되었어요", "김영희님과 친구가 되었어요. 먼저 인사해 보세요")
    ]


async def test_counter_request_makes_friends(client: AsyncClient) -> None:
    """상대가 먼저 신청했는데 나도 신청하면 바로 친구 — 먼저 신청한 사람에게 알림"""
    ha, a = await signup_user(client, "김영희")
    hb, b = await signup_user(client, "박정호")
    await client.post(f"{API}/friends/requests", headers=hb, json={"to_user_id": a["id"]})
    await client.post(f"{API}/friends/requests", headers=ha, json={"to_user_id": b["id"]})
    titles = [x["title"] for x in await _inbox(client, hb)]
    assert titles == ["친구가 되었어요"]


async def test_risky_message_goes_to_receiver_only(client: AsyncClient) -> None:
    ha, a = await signup_user(client, "김영희")
    hb, b = await signup_user(client, "정덕수")
    await client.post(f"{API}/friends/requests", headers=ha, json={"to_user_id": b["id"]})
    await client.post(f"{API}/friends/requests", headers=hb, json={"to_user_id": a["id"]})
    rid = (await client.post(f"{API}/chats/with/{b['id']}", headers=ha)).json()["id"]
    await client.post(f"{API}/notifications/read-all", headers=ha)
    before = len(await _inbox(client, ha))

    # 주의(1단계: 서두르기만)는 대화 화면 표시만, 알림함에는 남기지 않는다
    await client.post(f"{API}/chats/{rid}/messages", headers=hb, json={"text": "급해요"})
    assert len(await _inbox(client, ha)) == before

    await client.post(
        f"{API}/chats/{rid}/messages", headers=hb, json={"text": "병원비 때문에 계좌로 송금 좀"}
    )
    n = (await _inbox(client, ha))[0]
    assert n["kind"] == "safety" and n["title"] == "조심하세요"
    assert n["body"] == "정덕수님 메시지에 돈·송금 이야기가 있어요"
    assert n["link"] == f"/chats/{rid}" and n["read"] is False
    assert all(x["kind"] != "safety" for x in await _inbox(client, hb))

    await client.post(
        f"{API}/chats/{rid}/messages", headers=hb, json={"text": "인증번호 좀 불러 주세요"}
    )
    n = (await _inbox(client, ha))[0]
    assert n["body"] == "정덕수님 메시지에 비밀번호·인증번호 같은 개인정보가 있어요"


async def test_activity_applied_and_read(
    client: AsyncClient, db_sessionmaker: async_sessionmaker[AsyncSession]
) -> None:
    h, _ = await signup_user(client, "김영희")
    soon = datetime.now(UTC) + timedelta(days=3)
    async with db_sessionmaker() as s:
        a = Activity(
            title="건강 걷기 모임",
            category="health",
            region_code="41",
            place="공원",
            schedule_text="화 10시",
            starts_at=soon,
            ends_at=soon + timedelta(hours=1),
            capacity=10,
        )
        s.add(a)
        await s.commit()
        aid = str(a.id)

    await client.post(f"{API}/activities/{aid}/application", headers=h)
    # 취소했다 다시 신청해도 소식은 하나
    await client.delete(f"{API}/activities/{aid}/application", headers=h)
    await client.post(f"{API}/activities/{aid}/application", headers=h)
    items = await _inbox(client, h)
    assert [(x["kind"], x["title"], x["body"], x["link"]) for x in items] == [
        ("activity", "신청한 활동", "건강 걷기 모임 · 화 10시", f"/activities/{aid}")
    ]

    nid = items[0]["id"]
    assert (await client.post(f"{API}/notifications/{nid}/read", headers=h)).status_code == 204
    assert (await _inbox(client, h))[0]["read"] is True
    # 두 번 읽어도 그대로
    assert (await client.post(f"{API}/notifications/{nid}/read", headers=h)).status_code == 204

    # 남의 알림은 읽음 처리할 수 없다 (없는 것처럼)
    hb, _ = await signup_user(client, "이순자")
    r = await client.post(f"{API}/notifications/{nid}/read", headers=hb)
    assert r.status_code == 404 and r.json()["error"]["message"] == "없는 알림이에요."
    assert (await client.get(f"{API}/notifications")).status_code == 401


async def test_read_all(client: AsyncClient) -> None:
    ha, a = await signup_user(client, "김영희")
    for name in ("박정호", "이순자", "최영수"):
        hx, _ = await signup_user(client, name)
        await client.post(f"{API}/friends/requests", headers=hx, json={"to_user_id": a["id"]})
    items = await _inbox(client, ha)
    assert len(items) == 3 and not any(x["read"] for x in items)
    assert (await client.post(f"{API}/notifications/read-all", headers=ha)).status_code == 204
    assert all(x["read"] for x in await _inbox(client, ha))
