"""C4 휴대폰 알림(Web Push): 기기 구독, 커밋 뒤 발송, 만료 구독 정리, 시험 알림.

발송기는 가짜(FakePush)로 바꿔 끼워 무엇을 누구에게 보냈는지 본다.
"""

import json
from collections.abc import Iterator

import pytest
from httpx import AsyncClient
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.core.config import get_settings
from app.domains.notification import push
from app.domains.notification.models import MAX_PUSH_DEVICES, PushSubscription
from app.domains.notification.push import PushMessage
from app.integrations.webpush.base import PushResult, PushTarget
from tests.integration.helpers import signup_user

API = "/api/v1"
KEYS = {"p256dh": "B" + "x" * 86, "auth": "a" * 22}


def _ep(n: str) -> str:
    return f"https://fcm.googleapis.com/fcm/send/{n}"


class FakePush:
    name = "fake"

    def __init__(self) -> None:
        self.sent: list[tuple[str, dict]] = []
        #: 이 주소는 구독이 끝났다고(410) 답한다
        self.gone: set[str] = set()

    async def send(self, target: PushTarget, payload: str, ttl: int, urgency: str) -> PushResult:
        if target.endpoint in self.gone:
            return PushResult(ok=False, gone=True, error="구독 만료 (410)")
        self.sent.append((target.endpoint, json.loads(payload)))
        return PushResult(ok=True)

    def to(self, endpoint: str) -> list[dict]:
        return [p for e, p in self.sent if e == endpoint]


@pytest.fixture
def fake(
    db_sessionmaker: async_sessionmaker[AsyncSession], monkeypatch: pytest.MonkeyPatch
) -> Iterator[FakePush]:
    f = FakePush()
    push.use_sender(f)
    push.use_sessions(db_sessionmaker)
    monkeypatch.setattr(get_settings(), "vapid_public_key", "BPublicKeyForTest")
    yield f
    push.use_sender(None)
    push.use_sessions(None)


async def _subscribe(client: AsyncClient, h: dict, endpoint: str) -> int:
    body = {"endpoint": endpoint, "keys": KEYS}
    r = await client.put(f"{API}/notifications/push/subscription", headers=h, json=body)
    return r.status_code


async def _friends(client: AsyncClient, ha: dict, a: dict, hb: dict, b: dict) -> str:
    """둘을 친구로 만들고 대화방 id"""
    await client.post(f"{API}/friends/requests", headers=ha, json={"to_user_id": b["id"]})
    await client.post(f"{API}/friends/requests", headers=hb, json={"to_user_id": a["id"]})
    return (await client.post(f"{API}/chats/with/{b['id']}", headers=ha)).json()["id"]


async def test_disabled_without_keys(client: AsyncClient) -> None:
    """VAPID 키가 없으면(기본) 화면에 '준비 중' — 공개 키도 내려주지 않는다"""
    h, _ = await signup_user(client, "김영희")
    r = await client.get(f"{API}/notifications/push", headers=h)
    assert r.status_code == 200
    assert r.json()["enabled"] is False and r.json()["public_key"] is None
    r = await client.post(f"{API}/notifications/push/test", headers=h)
    assert r.status_code == 409 and r.json()["error"]["code"] == "push_disabled"


async def test_subscribe_only_known_push_services(client: AsyncClient, fake: FakePush) -> None:
    h, _ = await signup_user(client, "김영희")
    cfg = (await client.get(f"{API}/notifications/push", headers=h)).json()
    assert cfg == {
        "enabled": True,
        "public_key": "BPublicKeyForTest",
        "quiet_hours": "밤 9시부터 아침 8시까지는 소리·진동 없이 알려 드려요",
    }
    # 서버가 이 주소로 요청을 보내므로 아무 주소나 받지 않는다 (SSRF)
    for bad in (
        "http://fcm.googleapis.com/fcm/send/x",
        "https://169.254.169.254/latest",
        "https://evil.example/fcm.googleapis.com",
        "https://fcm.googleapis.com.evil.example/x",
        "https://fcm.googleapis.com:8443/x",
        "https://user@fcm.googleapis.com/x",
    ):
        assert await _subscribe(client, h, bad) == 422, bad
    assert await _subscribe(client, h, _ep("ok")) == 204
    mozilla = "https://updates.push.services.mozilla.com/wpush/v2/x"
    assert await _subscribe(client, h, mozilla) == 204
    assert await _subscribe(client, h, "https://web.push.apple.com/QK1") == 204


async def test_friend_request_pushes_receiver_after_commit(
    client: AsyncClient, fake: FakePush
) -> None:
    ha, a = await signup_user(client, "김영희")
    hb, b = await signup_user(client, "박정호")
    await _subscribe(client, ha, _ep("a"))
    await _subscribe(client, hb, _ep("b"))

    await client.post(f"{API}/friends/requests", headers=hb, json={"to_user_id": a["id"]})
    await push.drain()
    [p] = fake.to(_ep("a"))
    assert p["title"] == "새 친구 신청"
    assert p["body"] == "박정호님이 친구 신청을 보냈어요"
    assert p["link"] == "/friends" and isinstance(p["quiet"], bool)
    assert fake.to(_ep("b")) == []  # 보낸 사람에게는 없음

    # 같은 신청을 다시 눌러도 알림함·휴대폰 알림 모두 한 번
    await client.post(f"{API}/friends/requests", headers=hb, json={"to_user_id": a["id"]})
    await push.drain()
    assert len(fake.to(_ep("a"))) == 1


async def test_new_message_push_has_no_content(client: AsyncClient, fake: FakePush) -> None:
    ha, a = await signup_user(client, "김영희")
    hb, b = await signup_user(client, "정덕수")
    rid = await _friends(client, ha, a, hb, b)
    await _subscribe(client, ha, _ep("a"))
    await push.drain()
    fake.sent.clear()

    await client.post(f"{API}/chats/{rid}/messages", headers=hb, json={"text": "내일 산책 가요"})
    await push.drain()
    [p] = fake.to(_ep("a"))
    assert p["title"] == "정덕수님이 메시지를 보냈어요"
    assert p["body"] == "눌러서 확인해 보세요"
    assert "산책" not in json.dumps(p, ensure_ascii=False)  # 잠금 화면에 대화 내용 X
    assert p["link"] == f"/chats/{rid}" and p["tag"] == f"chat:{rid}"

    # 위험 대화(경고 이상)는 '조심하세요' 하나만 — 같은 tag 라 기기에서 한 칸
    fake.sent.clear()
    await client.post(
        f"{API}/chats/{rid}/messages", headers=hb, json={"text": "병원비 때문에 계좌로 송금 좀"}
    )
    await push.drain()
    [p] = fake.to(_ep("a"))
    assert p["title"] == "조심하세요" and p["tag"] == f"chat:{rid}"


async def test_activity_applied_is_not_pushed(
    client: AsyncClient, fake: FakePush, db_sessionmaker: async_sessionmaker[AsyncSession]
) -> None:
    """방금 스스로 한 일(활동 신청)은 알림함에만"""
    from datetime import UTC, datetime, timedelta

    from app.domains.activity.models import Activity

    h, _ = await signup_user(client, "김영희")
    await _subscribe(client, h, _ep("a"))
    soon = datetime.now(UTC) + timedelta(days=3)
    async with db_sessionmaker() as s:
        act = Activity(
            title="건강 걷기 모임",
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
        aid = str(act.id)
    await client.post(f"{API}/activities/{aid}/application", headers=h)
    await push.drain()
    assert fake.sent == []
    assert len((await client.get(f"{API}/notifications", headers=h)).json()) == 1


async def test_gone_subscription_is_removed(
    client: AsyncClient, fake: FakePush, db_sessionmaker: async_sessionmaker[AsyncSession]
) -> None:
    ha, a = await signup_user(client, "김영희")
    hb, _ = await signup_user(client, "박정호")
    await _subscribe(client, ha, _ep("old-phone"))
    await _subscribe(client, ha, _ep("new-phone"))
    fake.gone.add(_ep("old-phone"))

    await client.post(f"{API}/friends/requests", headers=hb, json={"to_user_id": a["id"]})
    await push.drain()
    assert len(fake.to(_ep("new-phone"))) == 1
    async with db_sessionmaker() as s:
        rows = {r.endpoint: r for r in await s.scalars(select(PushSubscription))}
    assert set(rows) == {_ep("new-phone")}
    assert rows[_ep("new-phone")].last_sent_at is not None


async def test_device_moves_to_new_account_and_unsubscribe(
    client: AsyncClient, fake: FakePush
) -> None:
    """같은 기기에서 다른 계정이 켜면 그 계정으로 — 앞 사람 알림이 뒷사람에게 가지 않게"""
    ha, a = await signup_user(client, "김영희")
    hb, b = await signup_user(client, "박정호")
    hc, _ = await signup_user(client, "이순자")
    await _subscribe(client, ha, _ep("shared"))
    await _subscribe(client, hb, _ep("shared"))

    await client.post(f"{API}/friends/requests", headers=hc, json={"to_user_id": a["id"]})
    await push.drain()
    assert fake.sent == []  # 이제 김영희의 기기가 아님
    await client.post(f"{API}/friends/requests", headers=hc, json={"to_user_id": b["id"]})
    await push.drain()
    assert len(fake.to(_ep("shared"))) == 1

    # 남의 구독은 끌 수 없고, 내 것은 끌 수 있다
    fake.sent.clear()
    r = await client.post(
        f"{API}/notifications/push/unsubscribe", headers=ha, json={"endpoint": _ep("shared")}
    )
    assert r.status_code == 204
    await client.post(f"{API}/friends/requests", headers=ha, json={"to_user_id": b["id"]})
    await push.drain()
    assert len(fake.to(_ep("shared"))) == 1
    await client.post(
        f"{API}/notifications/push/unsubscribe", headers=hb, json={"endpoint": _ep("shared")}
    )
    r = await client.post(f"{API}/notifications/push/test", headers=hb)
    assert r.status_code == 404


async def test_test_push_and_device_limit(
    client: AsyncClient, fake: FakePush, db_sessionmaker: async_sessionmaker[AsyncSession]
) -> None:
    h, _ = await signup_user(client, "김영희")
    for i in range(MAX_PUSH_DEVICES + 2):
        assert await _subscribe(client, h, _ep(f"d{i}")) == 204
    async with db_sessionmaker() as s:
        kept = {r.endpoint for r in await s.scalars(select(PushSubscription))}
    # 오래된 두 대가 정리된다
    assert len(kept) == MAX_PUSH_DEVICES
    assert _ep("d0") not in kept and _ep("d1") not in kept

    r = await client.post(f"{API}/notifications/push/test", headers=h)
    assert r.status_code == 200 and r.json() == {"sent": MAX_PUSH_DEVICES, "failed": 0}
    assert {p["title"] for _, p in fake.sent} == {"시험 알림이에요"}


async def test_rollback_sends_nothing(
    fake: FakePush, db_sessionmaker: async_sessionmaker[AsyncSession]
) -> None:
    """저장되지 않은 소식은 알리지 않는다 — 담아 둔 뒤 rollback 하면 다음 커밋에도 안 나감"""
    target = PushTarget(_ep("x"), KEYS["p256dh"], KEYS["auth"])
    async with db_sessionmaker() as s:
        await s.execute(text("select 1"))  # 실제처럼 트랜잭션 안에서 담는다
        push.queue(s, [target], PushMessage("t", "b", "/", "tag"))
        await s.rollback()
        await s.commit()
    await push.drain()
    assert fake.sent == []

    async with db_sessionmaker() as s:
        await s.execute(text("select 1"))
        push.queue(s, [target], PushMessage("t", "b", "/", "tag"))
        await s.commit()
    await push.drain()
    assert len(fake.sent) == 1
