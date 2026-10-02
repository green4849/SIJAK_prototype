"""지역생활 (⑥⑦): 우리 동네 활동 목록·상세·신청·관심."""

import uuid
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import TYPE_CHECKING, Literal

from app.core.errors import ConflictError, DomainError, NotFoundError
from app.domains.activity.models import CATEGORIES, Activity
from app.domains.activity.repository import ActivityRepository

if TYPE_CHECKING:
    from app.domains.auth.models import User

MineKind = Literal["applied", "liked"]


class ActivityClosedError(DomainError):
    code = "activity_closed"


@dataclass(frozen=True)
class ActivityView:
    activity: Activity
    applied_count: int
    applied: bool
    liked: bool

    @property
    def is_full(self) -> bool:
        return self.applied_count >= self.activity.capacity


class ActivityService:
    def __init__(self, repo: ActivityRepository) -> None:
        self.repo = repo

    async def browse(self, me: "User", category: str | None = None) -> list[ActivityView]:
        """내 지역 활동. 내 지역에 하나도 없으면 전체를 보여 준다 (빈 화면 방지)."""
        if category and category not in CATEGORIES:
            category = None
        now = datetime.now(UTC)
        items = await self.repo.list_upcoming(
            after=now, region_code=me.region_code, category=category
        )
        if not items:
            items = await self.repo.list_upcoming(after=now, region_code=None, category=category)
        return await self._views(me, items)

    async def detail(self, me: "User", activity_id: uuid.UUID) -> ActivityView:
        a = await self.repo.get(activity_id)
        if a is None:
            raise NotFoundError("활동을 찾을 수 없어요.")
        return (await self._views(me, [a]))[0]

    async def mine(self, me: "User", kind: MineKind) -> list[ActivityView]:
        ids = await (
            self.repo.applied_ids(me.id) if kind == "applied" else self.repo.liked_ids(me.id)
        )
        return await self._views(me, await self.repo.list_by_ids(ids))

    async def counts(self, me: "User") -> dict[str, int]:
        return {
            "applied": len(await self.repo.applied_ids(me.id)),
            "liked": len(await self.repo.liked_ids(me.id)),
        }

    # ---------- 신청 ----------

    async def apply(self, me: "User", activity_id: uuid.UUID) -> ActivityView:
        a = await self.repo.lock_activity(activity_id)
        if a is None:
            raise NotFoundError("활동을 찾을 수 없어요.")
        if a.id in await self.repo.applied_ids(me.id):
            return await self.detail(me, activity_id)  # 이미 신청 — 그대로
        if a.starts_at < datetime.now(UTC) - timedelta(hours=1):
            raise ActivityClosedError("이미 시작한 활동이에요.")
        if (await self.repo.applied_counts([a.id])).get(a.id, 0) >= a.capacity:
            raise ConflictError("아쉽게도 자리가 다 찼어요.", code="activity_full")
        await self.repo.add_application(a.id, me.id)
        await self.repo.commit()
        return await self.detail(me, activity_id)

    async def cancel(self, me: "User", activity_id: uuid.UUID) -> ActivityView:
        await self.repo.remove_application(activity_id, me.id)
        await self.repo.commit()
        return await self.detail(me, activity_id)

    # ---------- 관심 ----------

    async def set_like(self, me: "User", activity_id: uuid.UUID, liked: bool) -> ActivityView:
        view = await self.detail(me, activity_id)
        if liked and not view.liked:
            await self.repo.add_like(activity_id, me.id)
        elif not liked and view.liked:
            await self.repo.remove_like(activity_id, me.id)
        await self.repo.commit()
        return await self.detail(me, activity_id)

    # ---------- 내부 ----------

    async def _views(self, me: "User", items: list[Activity]) -> list[ActivityView]:
        ids = [a.id for a in items]
        counts = await self.repo.applied_counts(ids)
        applied = set(await self.repo.applied_ids(me.id))
        liked = set(await self.repo.liked_ids(me.id))
        return [ActivityView(a, counts.get(a.id, 0), a.id in applied, a.id in liked) for a in items]
