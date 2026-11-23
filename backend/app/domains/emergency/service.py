"""보호자 연결·긴급 도움 (C10).

긴급 도움은 지금 **기록만** 한다. 보호자 문자·푸시(C4), 담당 복지사 연계,
위치 첨부(동의한 경우)는 이 서비스의 `sos` 에 붙일 자리 — docs/deferred.md §7.
"""

import uuid
from dataclasses import dataclass
from datetime import datetime

from app.core.errors import DomainError
from app.core.security import decrypt, encrypt
from app.domains.emergency.models import MAX_GUARDIANS, Guardian, SosEvent
from app.domains.emergency.repository import EmergencyRepository


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
    notified: list[dict[str, str]]


def _view(g: Guardian) -> GuardianView:
    return GuardianView(id=g.id, name=g.name, relation=g.relation, phone=decrypt(g.phone_enc))


class EmergencyService:
    def __init__(self, repo: EmergencyRepository) -> None:
        self.repo = repo

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

    async def sos(self, user_id: uuid.UUID) -> SosResult:
        notified = [
            {"name": g.name, "relation": g.relation} for g in await self.repo.guardians(user_id)
        ]
        ev = await self.repo.add_sos(SosEvent(user_id=user_id, notified=notified))
        await self.repo.commit()
        # TODO(C4): 보호자 문자·푸시, 담당 복지사 알림 — 지금은 기록만
        return SosResult(id=ev.id, created_at=ev.created_at, notified=notified)

    async def recent_sos_user_ids(self, since: datetime) -> set[uuid.UUID]:
        """since 이후 긴급 도움을 누른 사람 — 운영자 돌봄 목록의 '보호자 알림' 표시 (B7)"""
        return await self.repo.sos_user_ids_since(since)
