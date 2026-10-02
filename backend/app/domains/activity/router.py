import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query

from app.core.deps import DbSession
from app.domains.activity.models import CATEGORIES
from app.domains.activity.repository import ActivityRepository
from app.domains.activity.schemas import ActivityOut, CategoryOption, MyActivityCounts
from app.domains.activity.service import ActivityService, MineKind
from app.domains.auth.deps import CurrentUser

router = APIRouter(prefix="/activities", tags=["activity"])


def get_activity_service(session: DbSession) -> ActivityService:
    return ActivityService(ActivityRepository(session))


ActivityServiceDep = Annotated[ActivityService, Depends(get_activity_service)]


@router.get("/categories", response_model=list[CategoryOption])
async def categories() -> list[CategoryOption]:
    return [CategoryOption(code=k, label=v) for k, v in CATEGORIES.items()]


@router.get("", response_model=list[ActivityOut])
async def list_activities(
    me: CurrentUser, service: ActivityServiceDep, category: str | None = None
) -> list[ActivityOut]:
    return [ActivityOut.of(v) for v in await service.browse(me, category)]


@router.get("/mine", response_model=list[ActivityOut])
async def mine(
    me: CurrentUser, service: ActivityServiceDep, kind: Annotated[MineKind, Query()] = "applied"
) -> list[ActivityOut]:
    return [ActivityOut.of(v) for v in await service.mine(me, kind)]


@router.get("/mine/counts", response_model=MyActivityCounts)
async def mine_counts(me: CurrentUser, service: ActivityServiceDep) -> MyActivityCounts:
    return MyActivityCounts(**await service.counts(me))


@router.get("/{activity_id}", response_model=ActivityOut)
async def detail(
    activity_id: uuid.UUID, me: CurrentUser, service: ActivityServiceDep
) -> ActivityOut:
    return ActivityOut.of(await service.detail(me, activity_id))


@router.post("/{activity_id}/application", response_model=ActivityOut)
async def apply(
    activity_id: uuid.UUID, me: CurrentUser, service: ActivityServiceDep
) -> ActivityOut:
    return ActivityOut.of(await service.apply(me, activity_id))


@router.delete("/{activity_id}/application", response_model=ActivityOut)
async def cancel(
    activity_id: uuid.UUID, me: CurrentUser, service: ActivityServiceDep
) -> ActivityOut:
    return ActivityOut.of(await service.cancel(me, activity_id))


@router.put("/{activity_id}/like", response_model=ActivityOut)
async def like(activity_id: uuid.UUID, me: CurrentUser, service: ActivityServiceDep) -> ActivityOut:
    return ActivityOut.of(await service.set_like(me, activity_id, True))


@router.delete("/{activity_id}/like", response_model=ActivityOut)
async def unlike(
    activity_id: uuid.UUID, me: CurrentUser, service: ActivityServiceDep
) -> ActivityOut:
    return ActivityOut.of(await service.set_like(me, activity_id, False))
