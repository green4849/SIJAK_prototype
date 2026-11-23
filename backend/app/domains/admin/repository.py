import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.admin.models import ModerationAction


class AdminRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def add_action(
        self, case_id: str, action: str, target_id: uuid.UUID, operator_id: uuid.UUID
    ) -> None:
        self.session.add(
            ModerationAction(
                case_id=case_id, action=action, target_id=target_id, operator_id=operator_id
            )
        )
        await self.session.flush()

    async def last_actions(self, case_ids: list[str]) -> dict[str, str]:
        """사건별 마지막 처리"""
        if not case_ids:
            return {}
        q = (
            select(ModerationAction.case_id, ModerationAction.action)
            .where(ModerationAction.case_id.in_(case_ids))
            .order_by(ModerationAction.id)
        )
        # 오래된 것부터 덮어 쓰므로 마지막 처리가 남는다
        return {case_id: action for case_id, action in await self.session.execute(q)}

    async def lock_case(self, case_id: str) -> None:
        """같은 사건을 두 운영자가 동시에 처리하지 않게 (트랜잭션 끝까지)"""
        await self.session.execute(
            select(func.pg_advisory_xact_lock(func.hashtext(f"case:{case_id}")))
        )

    async def commit(self) -> None:
        await self.session.commit()
