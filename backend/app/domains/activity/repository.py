import uuid
from datetime import datetime

from sqlalchemy import delete, func, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.activity.models import Activity, ActivityApplication, ActivityLike


class ActivityRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get(self, activity_id: uuid.UUID) -> Activity | None:
        return await self.session.get(Activity, activity_id)

    async def list_upcoming(
        self, *, after: datetime, region_code: str | None, category: str | None
    ) -> list[Activity]:
        q = select(Activity).where(Activity.ends_at >= after)
        if region_code:
            q = q.where(Activity.region_code == region_code)
        if category:
            q = q.where(Activity.category == category)
        return list(await self.session.scalars(q.order_by(Activity.starts_at)))

    async def list_by_ids(self, ids: list[uuid.UUID]) -> list[Activity]:
        if not ids:
            return []
        q = select(Activity).where(Activity.id.in_(ids)).order_by(Activity.starts_at)
        return list(await self.session.scalars(q))

    # ---- 신청 ----

    async def applied_counts(self, ids: list[uuid.UUID]) -> dict[uuid.UUID, int]:
        if not ids:
            return {}
        q = (
            select(ActivityApplication.activity_id, func.count())
            .where(ActivityApplication.activity_id.in_(ids))
            .group_by(ActivityApplication.activity_id)
        )
        return {aid: int(n) for aid, n in (await self.session.execute(q)).all()}

    async def applied_ids(self, user_id: uuid.UUID) -> list[uuid.UUID]:
        q = select(ActivityApplication.activity_id).where(ActivityApplication.user_id == user_id)
        return list(await self.session.scalars(q))

    async def liked_ids(self, user_id: uuid.UUID) -> list[uuid.UUID]:
        q = select(ActivityLike.activity_id).where(ActivityLike.user_id == user_id)
        return list(await self.session.scalars(q))

    async def lock_activity(self, activity_id: uuid.UUID) -> Activity | None:
        """정원 확인 중 동시 신청을 막기 위해 행 잠금"""
        q = select(Activity).where(Activity.id == activity_id).with_for_update()
        return await self.session.scalar(q)

    async def add_application(self, activity_id: uuid.UUID, user_id: uuid.UUID) -> None:
        await self.session.execute(
            insert(ActivityApplication)
            .values(activity_id=activity_id, user_id=user_id)
            .on_conflict_do_nothing(index_elements=["activity_id", "user_id"])
        )

    async def remove_application(self, activity_id: uuid.UUID, user_id: uuid.UUID) -> None:
        await self.session.execute(
            delete(ActivityApplication).where(
                ActivityApplication.activity_id == activity_id,
                ActivityApplication.user_id == user_id,
            )
        )

    # ---- 관심 ----

    async def add_like(self, activity_id: uuid.UUID, user_id: uuid.UUID) -> None:
        await self.session.execute(
            insert(ActivityLike)
            .values(activity_id=activity_id, user_id=user_id)
            .on_conflict_do_nothing(index_elements=["activity_id", "user_id"])
        )

    async def remove_like(self, activity_id: uuid.UUID, user_id: uuid.UUID) -> None:
        await self.session.execute(
            delete(ActivityLike).where(
                ActivityLike.activity_id == activity_id, ActivityLike.user_id == user_id
            )
        )

    async def commit(self) -> None:
        await self.session.commit()
