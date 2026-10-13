import uuid
from datetime import UTC, datetime

from sqlalchemy import and_, or_, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.friend.models import FriendRequest, RecommendationRating


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

    async def add(self, from_id: uuid.UUID, to_id: uuid.UUID) -> None:
        """더블 탭으로 두 번 와도 1건 (UNIQUE from,to)"""
        await self.session.execute(
            insert(FriendRequest)
            .values(id=uuid.uuid4(), from_user_id=from_id, to_user_id=to_id, status="pending")
            .on_conflict_do_nothing(index_elements=["from_user_id", "to_user_id"])
        )

    async def set_status(self, req: FriendRequest, status: str) -> None:
        req.status = status
        req.responded_at = datetime.now(UTC)
        await self.session.flush()

    # ---- 추천 평가 (C12) ----

    async def ratings_by(self, user_id: uuid.UUID) -> dict[uuid.UUID, str]:
        q = select(RecommendationRating.target_id, RecommendationRating.rating).where(
            RecommendationRating.user_id == user_id
        )
        return {t: r for t, r in (await self.session.execute(q)).all()}

    async def set_rating(self, user_id: uuid.UUID, target_id: uuid.UUID, rating: str) -> None:
        stmt = insert(RecommendationRating).values(
            user_id=user_id, target_id=target_id, rating=rating
        )
        await self.session.execute(
            stmt.on_conflict_do_update(
                index_elements=["user_id", "target_id"],
                set_={"rating": stmt.excluded.rating, "updated_at": datetime.now(UTC)},
            )
        )

    async def commit(self) -> None:
        await self.session.commit()
