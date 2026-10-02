import uuid
from datetime import UTC, datetime

from sqlalchemy import and_, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.friend.models import FriendRequest


class FriendRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get(self, request_id: uuid.UUID) -> FriendRequest | None:
        return await self.session.get(FriendRequest, request_id)

    async def get_between(self, a: uuid.UUID, b: uuid.UUID) -> list[FriendRequest]:
        """두 사람 사이의 신청(양방향)"""
        q = select(FriendRequest).where(
            or_(
                and_(FriendRequest.from_user_id == a, FriendRequest.to_user_id == b),
                and_(FriendRequest.from_user_id == b, FriendRequest.to_user_id == a),
            )
        )
        return list(await self.session.scalars(q))

    async def list_involving(self, user_id: uuid.UUID) -> list[FriendRequest]:
        q = select(FriendRequest).where(
            or_(FriendRequest.from_user_id == user_id, FriendRequest.to_user_id == user_id)
        )
        return list(await self.session.scalars(q.order_by(FriendRequest.created_at.desc())))

    async def add(self, from_id: uuid.UUID, to_id: uuid.UUID) -> FriendRequest:
        req = FriendRequest(from_user_id=from_id, to_user_id=to_id)
        self.session.add(req)
        await self.session.flush()
        return req

    async def set_status(self, req: FriendRequest, status: str) -> None:
        req.status = status
        req.responded_at = datetime.now(UTC)
        await self.session.flush()

    async def commit(self) -> None:
        await self.session.commit()
