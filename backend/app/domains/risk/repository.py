import uuid

from sqlalchemy import delete, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.risk.models import Block, Report, RiskEvent


class RiskRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    def add_event(self, event: RiskEvent) -> None:
        self.session.add(event)

    def add_report(self, report: Report) -> None:
        self.session.add(report)

    async def get_block(self, blocker: uuid.UUID, blocked: uuid.UUID) -> Block | None:
        q = select(Block).where(Block.blocker_id == blocker, Block.blocked_id == blocked)
        return await self.session.scalar(q)

    def add_block(self, blocker: uuid.UUID, blocked: uuid.UUID) -> None:
        self.session.add(Block(blocker_id=blocker, blocked_id=blocked))

    async def remove_block(self, blocker: uuid.UUID, blocked: uuid.UUID) -> None:
        await self.session.execute(
            delete(Block).where(Block.blocker_id == blocker, Block.blocked_id == blocked)
        )

    async def list_blocked_by(self, blocker: uuid.UUID) -> list[uuid.UUID]:
        q = (
            select(Block.blocked_id)
            .where(Block.blocker_id == blocker)
            .order_by(Block.created_at.desc())
        )
        return list(await self.session.scalars(q))

    async def related_block_ids(self, user_id: uuid.UUID) -> set[uuid.UUID]:
        """내가 차단했거나 나를 차단한 사람 (양방향)"""
        q = select(Block.blocker_id, Block.blocked_id).where(
            or_(Block.blocker_id == user_id, Block.blocked_id == user_id)
        )
        out: set[uuid.UUID] = set()
        for blocker, blocked in (await self.session.execute(q)).all():
            out.add(blocked if blocker == user_id else blocker)
        return out

    async def commit(self) -> None:
        await self.session.commit()
