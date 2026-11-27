import uuid
from datetime import datetime

from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.emergency.models import MAX_SMS_ATTEMPTS, Guardian, SosDelivery, SosEvent


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

    async def add_deliveries(self, deliveries: list[SosDelivery]) -> None:
        self.session.add_all(deliveries)
        await self.session.flush()

    async def retryable_deliveries(self, since: datetime, limit: int = 100) -> list[SosDelivery]:
        """since 이후 요청 중 아직 못 보낸 문자 (횟수가 남은 것). 오래된 것부터"""
        q = (
            select(SosDelivery)
            .where(
                SosDelivery.status != "sent",
                SosDelivery.attempts < MAX_SMS_ATTEMPTS,
                SosDelivery.created_at >= since,
            )
            .order_by(SosDelivery.created_at)
            .limit(limit)
            .with_for_update(skip_locked=True)
        )
        return list(await self.session.scalars(q))

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
