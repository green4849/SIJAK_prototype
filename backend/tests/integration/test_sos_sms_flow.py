"""C10 긴급 도움 → 보호자 문자.

바로 보내기, 실패하면 한 번 더, 예약 작업 재시도, 연달아 누르기 제한
"""

from collections.abc import Iterator
from datetime import UTC, datetime, timedelta

import pytest
from httpx import AsyncClient
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.core.security import decrypt
from app.domains.emergency.models import MAX_SMS_ATTEMPTS, SosDelivery
from app.integrations.sms import get_sms_sender
from app.integrations.sms.base import SmsResult
from app.jobs import retry_sos_sms
from app.main import app as fastapi_app
from tests.integration.helpers import signup_user

API = "/api/v1"


class FakeSms:
    name = "fake"

    def __init__(self) -> None:
        self.sent: list[tuple[str, str]] = []
        #: 이 번호로는 실패
        self.failing: set[str] = set()
        self.raise_for: set[str] = set()

    async def send(self, to: str, text: str) -> SmsResult:
        if to in self.raise_for:
            raise RuntimeError("provider 버그")
        if to in self.failing:
            return SmsResult(ok=False, error="E1: 수신 거부")
        self.sent.append((to, text))
        return SmsResult(ok=True, message_id=f"m{len(self.sent)}")


@pytest.fixture
def sms(client: AsyncClient) -> Iterator[FakeSms]:
    fake = FakeSms()
    fastapi_app.dependency_overrides[get_sms_sender] = lambda: fake
    yield fake
    fastapi_app.dependency_overrides.pop(get_sms_sender, None)


async def _guardians(client: AsyncClient, h: dict, *rows: tuple[str, str, str]) -> None:
    for name, rel, phone in rows:
        r = await client.post(
            f"{API}/me/guardians", headers=h, json={"name": name, "relation": rel, "phone": phone}
        )
        assert r.status_code == 201


async def test_sos_texts_every_guardian(
    client: AsyncClient, sms: FakeSms, db_sessionmaker: async_sessionmaker[AsyncSession]
) -> None:
    h, _ = await signup_user(client, "김영희")
    me_phone = (await client.get(f"{API}/me", headers=h)).json()
    assert (await client.get(f"{API}/emergency", headers=h)).json() == {"sms_enabled": True}
    await _guardians(
        client, h, ("김민수", "아들", "01098765432"), ("박선희", "담당 복지사", "0312345678")
    )

    r = await client.post(f"{API}/emergency/sos", headers=h)
    assert r.status_code == 201, r.text
    out = r.json()
    assert out["delivery_status"] == "sent"
    assert [n["status"] for n in out["notified"]] == ["sent", "sent"]

    assert sorted(to for to, _ in sms.sent) == ["01098765432", "0312345678"]
    text = sms.sent[0][1]
    # 누가 · 무엇을 · 바로 연락할 번호(요청한 분의 번호)
    assert text.startswith("[시작] 김영희님이 긴급 도움을 요청했어요.")
    assert "바로 연락해 주세요" in text and "010-9000-" in text
    assert me_phone  # /me 는 번호를 돌려주지 않아도 된다 — 문자에는 서버가 넣는다

    async with db_sessionmaker() as s:
        rows = list(await s.scalars(select(SosDelivery).order_by(SosDelivery.guardian_name)))
    assert [(d.guardian_name, d.status, d.attempts, d.provider) for d in rows] == [
        ("김민수", "sent", 1, "fake"),
        ("박선희", "sent", 1, "fake"),
    ]
    assert all(d.sent_at and d.provider_message_id and d.last_error is None for d in rows)
    # 보낸 번호는 암호화해 둔다
    assert all(b"0109876" not in d.phone_enc and b"031234" not in d.phone_enc for d in rows)
    assert decrypt(rows[0].phone_enc) == "01098765432"


async def test_sos_from_account_without_phone(
    client: AsyncClient, sms: FakeSms, db_sessionmaker: async_sessionmaker[AsyncSession]
) -> None:
    """카카오로 가입한 분은 앱에 전화번호가 없다 — 그래도 보호자에게 문자가 간다 (번호 없이)"""
    from app.domains.auth.models import User

    h, me = await signup_user(client, "김영희")
    async with db_sessionmaker() as s:
        await s.execute(
            update(User).where(User.id == me["id"]).values(phone_enc=None, phone_hash=None)
        )
        await s.commit()
    await _guardians(client, h, ("김민수", "아들", "01098765432"))

    r = await client.post(f"{API}/emergency/sos", headers=h)
    assert r.status_code == 201, r.text
    assert r.json()["delivery_status"] == "sent"
    assert sms.sent == [
        ("01098765432", "[시작] 김영희님이 긴급 도움을 요청했어요. 바로 연락해 주세요.")
    ]


async def test_partial_failure_then_job_retry(
    client: AsyncClient, sms: FakeSms, db_sessionmaker: async_sessionmaker[AsyncSession]
) -> None:
    h, _ = await signup_user(client, "김영희")
    await _guardians(client, h, ("김민수", "아들", "01098765432"), ("박선희", "딸", "01011112222"))
    sms.failing.add("01011112222")

    out = (await client.post(f"{API}/emergency/sos", headers=h)).json()
    assert out["delivery_status"] == "partial"
    assert {n["name"]: n["status"] for n in out["notified"]} == {
        "김민수": "sent",
        "박선희": "failed",
    }

    async with db_sessionmaker() as s:
        failed = (await s.scalars(select(SosDelivery).where(SosDelivery.status == "failed"))).one()
    assert failed.attempts == 2  # 요청 처리 중 한 번 더 시도
    assert failed.last_error == "E1: 수신 거부"

    # 예약 작업이 다시 보낸다 — 이번에는 된다. 이미 보낸 김민수님께는 다시 보내지 않는다
    sms.failing.clear()
    before = len(sms.sent)
    assert await retry_sos_sms(db_sessionmaker, sms) == {"sos_sms_sent": 1, "sos_sms_failed": 0}
    assert [to for to, _ in sms.sent[before:]] == ["01011112222"]
    async with db_sessionmaker() as s:
        d = await s.get(SosDelivery, failed.id)
    assert d is not None and d.status == "sent" and d.attempts == 3 and d.last_error is None
    # 더 보낼 것이 없다
    assert await retry_sos_sms(db_sessionmaker, sms) == {"sos_sms_sent": 0, "sos_sms_failed": 0}


async def test_retry_stops_after_max_attempts_and_window(
    client: AsyncClient, sms: FakeSms, db_sessionmaker: async_sessionmaker[AsyncSession]
) -> None:
    h, _ = await signup_user(client, "김영희")
    await _guardians(client, h, ("김민수", "아들", "01098765432"))
    sms.raise_for.add("01098765432")  # provider 가 예외를 던져도 요청은 성공하고 실패로 남는다

    out = (await client.post(f"{API}/emergency/sos", headers=h)).json()
    assert out["delivery_status"] == "failed"

    # 3번째(마지막) 시도도 실패 → 더는 시도하지 않는다
    assert await retry_sos_sms(db_sessionmaker, sms) == {"sos_sms_sent": 0, "sos_sms_failed": 1}
    assert await retry_sos_sms(db_sessionmaker, sms) == {"sos_sms_sent": 0, "sos_sms_failed": 0}
    async with db_sessionmaker() as s:
        d = (await s.scalars(select(SosDelivery))).one()
    assert d.attempts == MAX_SMS_ATTEMPTS and d.status == "failed"
    assert d.last_error == "예외: RuntimeError"

    # 한 시간이 지난 요청은 다시 보내지 않는다 (늦은 '긴급' 문자는 혼란을 준다)
    sms.raise_for.clear()
    async with db_sessionmaker() as s:
        await s.execute(update(SosDelivery).values(attempts=0))
        await s.commit()
    later = datetime.now(UTC) + timedelta(hours=1, minutes=1)
    assert await retry_sos_sms(db_sessionmaker, sms, now=later) == {
        "sos_sms_sent": 0,
        "sos_sms_failed": 0,
    }


async def test_sos_without_guardians_sends_nothing(client: AsyncClient, sms: FakeSms) -> None:
    h, _ = await signup_user(client, "김영희")
    out = (await client.post(f"{API}/emergency/sos", headers=h)).json()
    assert out == {**out, "notified": [], "delivery_status": "not_sent"}
    assert sms.sent == []


async def test_sos_is_rate_limited(client: AsyncClient, sms: FakeSms) -> None:
    h, _ = await signup_user(client, "김영희")
    await _guardians(client, h, ("김민수", "아들", "01098765432"))
    for _ in range(3):
        assert (await client.post(f"{API}/emergency/sos", headers=h)).status_code == 201
    r = await client.post(f"{API}/emergency/sos", headers=h)
    assert r.status_code == 429
    assert len(sms.sent) == 3  # 네 번째는 문자도 나가지 않는다
