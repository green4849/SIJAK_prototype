import uuid
from datetime import datetime

from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.emergency.models import Guardian, SosEvent


class EmergencyRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def guardians(self, user_id: uuid.UUID) -> list[Guardian]:
        q = (
            select(Guardian)
            .where(Guardian.user_id == user_id)
            .order_by(Guardian.created_at, Guardian.id)
        )
        return list(await self.session.scalars(q))

    async def count_guardians(self, user_id: uuid.UUID) -> int:
        q = select(func.count()).where(Guardian.user_id == user_id)
        return int(await self.session.scalar(q) or 0)

    async def add_guardian(self, guardian: Guardian) -> Guardian:
        self.session.add(guardian)
        await self.session.flush()
        await self.session.refresh(guardian)
        return guardian

    async def delete_guardian(self, user_id: uuid.UUID, guardian_id: uuid.UUID) -> None:
        await self.session.execute(
            delete(Guardian).where(Guardian.user_id == user_id, Guardian.id == guardian_id)
        )

    async def add_sos(self, event: SosEvent) -> SosEvent:
        self.session.add(event)
        await self.session.flush()
        await self.session.refresh(event)
        return event

    async def sos_user_ids_since(self, since: datetime) -> set[uuid.UUID]:
        q = select(SosEvent.user_id).where(SosEvent.created_at >= since).distinct()
        return set(await self.session.scalars(q))

    async def lock_user(self, user_id: uuid.UUID) -> None:
        """보호자 수 확인~추가 사이에 다른 요청이 끼지 않게 (트랜잭션 끝까지)"""
        await self.session.execute(
            select(func.pg_advisory_xact_lock(func.hashtext(f"guardians:{user_id}")))
        )

    async def commit(self) -> None:
        await self.session.commit()
