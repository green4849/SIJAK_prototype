"""안전 (⑧의 실체): 위험 대화 감지, 신고, 차단.

다른 도메인(chat, friend)이 이 서비스를 쓴다. risk는 그 도메인들을 모른다 (단방향).
"""

import uuid

from app.core.errors import DomainError
from app.domains.risk.models import REPORT_REASONS, Report, RiskEvent
from app.domains.risk.repository import RiskRepository
from app.domains.risk.rules import Assessment, assess_text


class InvalidReportError(DomainError):
    status_code = 422
    code = "invalid_report"


class RiskService:
    def __init__(self, repo: RiskRepository) -> None:
        self.repo = repo

    # ---------- 위험 대화 감지 ----------

    def assess_message(self, sender_id: uuid.UUID, message_id: int, text: str) -> Assessment:
        """1단계 룰만. TODO(deferred §3): 걸린 메시지를 ML 분류기로 넘기는 자리.

        커밋은 호출한 쪽(chat) 트랜잭션에 맡긴다.
        """
        result = assess_text(text)
        if result.flagged:
            self.repo.add_event(
                RiskEvent(
                    message_id=message_id,
                    sender_id=sender_id,
                    level=result.level,
                    codes=",".join(result.codes),
                )
            )
        return result

    # ---------- 신고 ----------

    async def report(
        self, me: uuid.UUID, target: uuid.UUID, reason: str, message_id: int | None = None
    ) -> None:
        if target == me:
            raise InvalidReportError("나를 신고할 수는 없어요.")
        if reason not in REPORT_REASONS:
            raise InvalidReportError("신고 이유를 골라 주세요.")
        self.repo.add_report(
            Report(reporter_id=me, target_id=target, reason=reason, message_id=message_id)
        )
        await self.repo.commit()

    # ---------- 차단 ----------

    async def block(self, me: uuid.UUID, target: uuid.UUID) -> None:
        if target == me:
            raise InvalidReportError("나를 차단할 수는 없어요.")
        if await self.repo.get_block(me, target) is None:
            self.repo.add_block(me, target)
            await self.repo.commit()

    async def unblock(self, me: uuid.UUID, target: uuid.UUID) -> None:
        await self.repo.remove_block(me, target)
        await self.repo.commit()

    async def blocked_by_me(self, me: uuid.UUID) -> list[uuid.UUID]:
        return await self.repo.list_blocked_by(me)

    # ---------- 다른 도메인용 공개 메서드 ----------

    async def related_block_ids(self, user_id: uuid.UUID) -> set[uuid.UUID]:
        return await self.repo.related_block_ids(user_id)

    async def is_blocked_between(self, a: uuid.UUID, b: uuid.UUID) -> bool:
        return b in await self.repo.related_block_ids(a)
