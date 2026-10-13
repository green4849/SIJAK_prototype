import uuid
from datetime import datetime

from sqlalchemy import delete, func, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.point.models import PointEntry


class PointRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def balance(self, user_id: uuid.UUID) -> int:
        q = select(func.coalesce(func.sum(PointEntry.amount), 0)).where(
            PointEntry.user_id == user_id
        )
        return int(await self.session.scalar(q) or 0)

    async def has_ref(self, user_id: uuid.UUID, ref: str) -> bool:
        q = select(PointEntry.id).where(PointEntry.user_id == user_id, PointEntry.ref == ref)
        return await self.session.scalar(q) is not None

    async def count_reason(
        self, user_id: uuid.UUID, reason: str, since: datetime | None = None
    ) -> int:
        q = select(func.count()).where(PointEntry.user_id == user_id, PointEntry.reason == reason)
        if since is not None:
            q = q.where(PointEntry.created_at >= since)
        return int(await self.session.scalar(q) or 0)

    async def add(self, user_id: uuid.UUID, amount: int, reason: str, ref: str, memo: str) -> bool:
        """같은 ref 가 이미 있으면 아무것도 안 하고 False (더블 탭·재시도에도 1건)"""
        result = await self.session.execute(
            insert(PointEntry)
            .values(user_id=user_id, amount=amount, reason=reason, ref=ref, memo=memo)
            .on_conflict_do_nothing(index_elements=["user_id", "ref"])
            .returning(PointEntry.id)
        )
        return result.scalar() is not None

    async def remove(self, user_id: uuid.UUID, ref: str) -> None:
        await self.session.execute(
            delete(PointEntry).where(PointEntry.user_id == user_id, PointEntry.ref == ref)
        )

    async def history(self, user_id: uuid.UUID, limit: int) -> list[PointEntry]:
        q = (
            select(PointEntry)
            .where(PointEntry.user_id == user_id)
            .order_by(PointEntry.id.desc())
            .limit(limit)
        )
        return list(await self.session.scalars(q))

    async def lock_user(self, user_id: uuid.UUID) -> None:
        """잔액 확인~차감 사이에 다른 요청이 끼지 않게 사용자 단위로 잠근다 (트랜잭션 끝까지)"""
        await self.session.execute(
            select(func.pg_advisory_xact_lock(func.hashtext(f"points:{user_id}")))
        )

    async def commit(self) -> None:
        await self.session.commit()
