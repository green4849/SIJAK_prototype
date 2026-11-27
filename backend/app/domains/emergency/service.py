"""보호자 연결·긴급 도움 (C10).

긴급 도움을 누르면
  1) 요청과 보호자별 문자 한 통씩을 '보낼 것'(pending)으로 먼저 저장·커밋한다
     — 보내는 도중 서버가 멈춰도 남는다
  2) 바로 보낸다(보호자 여럿은 동시에). 실패하면 그 자리에서 한 번 더
  3) 그래도 못 보낸 것은 예약 작업(`scripts.jobs sos-retry`)이 다시 보낸다 (MAX_SMS_ATTEMPTS 까지)
문자 발송이 꺼져 있으면(SMS_PROVIDER=off) 기록만 하고, 화면도 '보내지 않았어요'라고 말한다.
푸시(C4)·담당 복지사 연계·위치 첨부는 아직 — docs/deferred.md §7.
"""

import asyncio
import uuid
from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Literal

from app.core.errors import DomainError
from app.core.security import decrypt, encrypt
from app.domains.emergency.models import MAX_GUARDIANS, Guardian, SosDelivery, SosEvent
from app.domains.emergency.repository import EmergencyRepository
from app.integrations.sms.base import SmsSender

DeliveryStatus = Literal["not_sent", "sent", "partial", "failed"]
#: 요청 처리 중에 한 보호자에게 보내 보는 횟수 (나머지는 예약 작업)
IN_REQUEST_ATTEMPTS = 2


class TooManyGuardiansError(DomainError):
    status_code = 422
    code = "too_many_guardians"


@dataclass(frozen=True)
class GuardianView:
    id: uuid.UUID
    name: str
    relation: str
    #: 숫자만
    phone: str

    @property
    def phone_masked(self) -> str:
        """010-****-5678 (지역번호도 앞 3자리만 보인다: 031-****-5678)"""
        return f"{self.phone[:3]}-****-{self.phone[-4:]}"


@dataclass(frozen=True)
class SosResult:
    id: uuid.UUID
    created_at: datetime
    #: [{name, relation, status}] — status: sent | failed | not_sent(문자 발송이 꺼져 있음)
    notified: list[dict[str, str]]
    delivery_status: DeliveryStatus = "not_sent"


@dataclass
class RetryResult:
    sent: int = 0
    failed: int = 0
    tried: list[uuid.UUID] = field(default_factory=list)


def format_phone(digits: str) -> str:
    """01012345678 → 010-1234-5678, 0212345678 → 02-1234-5678"""
    if digits.startswith("02"):
        head, rest = digits[:2], digits[2:]
    else:
        head, rest = digits[:3], digits[3:]
    return f"{head}-{rest[:-4]}-{rest[-4:]}" if len(rest) > 4 else digits


def sos_text(requester_name: str, requester_phone: str) -> str:
    """보호자가 받는 문자 — 누가, 무엇을, 어떻게(바로 연락할 번호). 짧게"""
    return (
        f"[시작] {requester_name}님이 긴급 도움을 요청했어요. "
        f"바로 연락해 주세요. {format_phone(requester_phone)}"
    )


def overall_status(statuses: list[str]) -> DeliveryStatus:
    if not statuses or all(s == "not_sent" for s in statuses):
        return "not_sent"
    sent = sum(s == "sent" for s in statuses)
    if sent == len(statuses):
        return "sent"
    return "partial" if sent else "failed"


def _view(g: Guardian) -> GuardianView:
    return GuardianView(id=g.id, name=g.name, relation=g.relation, phone=decrypt(g.phone_enc))


class EmergencyService:
    def __init__(self, repo: EmergencyRepository, sms: SmsSender | None = None) -> None:
        self.repo = repo
        self.sms = sms

    @property
    def sms_enabled(self) -> bool:
        return self.sms is not None

    async def guardians(self, user_id: uuid.UUID) -> list[GuardianView]:
        return [_view(g) for g in await self.repo.guardians(user_id)]

    async def add_guardian(
        self, user_id: uuid.UUID, name: str, relation: str, phone: str
    ) -> GuardianView:
        """name·relation 은 앞뒤 공백을 뺀 값, phone 은 숫자만 (schemas 에서 검사)"""
        await self.repo.lock_user(user_id)
        if await self.repo.count_guardians(user_id) >= MAX_GUARDIANS:
            raise TooManyGuardiansError(f"보호자는 {MAX_GUARDIANS}명까지 등록할 수 있어요.")
        g = await self.repo.add_guardian(
            Guardian(user_id=user_id, name=name, relation=relation, phone_enc=encrypt(phone))
        )
        await self.repo.commit()
        return _view(g)

    async def remove_guardian(self, user_id: uuid.UUID, guardian_id: uuid.UUID) -> None:
        """없거나 남의 보호자면 아무것도 안 한다 (두 번 눌러도 같은 결과)"""
        await self.repo.delete_guardian(user_id, guardian_id)
        await self.repo.commit()

    async def sos(
        self, user_id: uuid.UUID, requester_name: str, requester_phone_enc: bytes
    ) -> SosResult:
        guardians = await self.repo.guardians(user_id)
        notified = [{"name": g.name, "relation": g.relation} for g in guardians]
        ev = await self.repo.add_sos(SosEvent(user_id=user_id, notified=notified))
        if self.sms is None or not guardians:
            await self.repo.commit()
            return SosResult(
                id=ev.id,
                created_at=ev.created_at,
                notified=[{**n, "status": "not_sent"} for n in notified],
            )

        # 1) 보낼 것을 먼저 저장 — 보내는 도중 서버가 멈춰도 예약 작업이 이어서 보낸다
        text = sos_text(requester_name, decrypt(requester_phone_enc))
        deliveries = [
            SosDelivery(
                sos_event_id=ev.id,
                guardian_name=g.name,
                relation=g.relation,
                phone_enc=g.phone_enc,
                text=text,
                status="pending",
                attempts=0,
                provider=self.sms.name,
            )
            for g in guardians
        ]
        await self.repo.add_deliveries(deliveries)
        await self.repo.commit()

        # 2) 바로 보낸다 — 보호자 여럿은 동시에, 실패하면 한 번 더
        await asyncio.gather(*(self._deliver(d, IN_REQUEST_ATTEMPTS) for d in deliveries))
        await self.repo.commit()

        statuses = [d.status for d in deliveries]
        return SosResult(
            id=ev.id,
            created_at=ev.created_at,
            notified=[
                {"name": d.guardian_name, "relation": d.relation, "status": d.status}
                for d in deliveries
            ],
            delivery_status=overall_status(statuses),
        )

    async def _deliver(self, d: SosDelivery, tries: int) -> None:
        """d 를 보내고 결과를 d 에 적는다 (커밋은 부른 쪽). 예외를 밖으로 던지지 않는다."""
        assert self.sms is not None
        to = decrypt(d.phone_enc)
        for _ in range(tries):
            d.attempts += 1
            try:
                r = await self.sms.send(to, d.text)
            except Exception as e:  # noqa: BLE001 — provider 버그로 다른 보호자 발송까지 막지 않는다
                d.status, d.last_error = "failed", f"예외: {type(e).__name__}"
                continue
            if r.ok:
                d.status, d.provider_message_id = "sent", r.message_id
                d.last_error, d.sent_at = None, datetime.now(UTC)
                return
            d.status, d.last_error = "failed", (r.error or "알 수 없는 실패")[:200]

    async def retry_deliveries(self, since: datetime) -> RetryResult:
        """since 이후 요청 중 못 보낸 문자를 다시 보낸다 — 예약 작업(sos-retry)."""
        result = RetryResult()
        if self.sms is None:
            return result
        pending = await self.repo.retryable_deliveries(since)
        for d in pending:
            await self._deliver(d, 1)
            result.tried.append(d.id)
            if d.status == "sent":
                result.sent += 1
            else:
                result.failed += 1
        await self.repo.commit()
        return result

    async def recent_sos_user_ids(self, since: datetime) -> set[uuid.UUID]:
        """since 이후 긴급 도움을 누른 사람 — 운영자 돌봄 목록의 요청 기록 표시 (B7)."""
        return await self.repo.sos_user_ids_since(since)
