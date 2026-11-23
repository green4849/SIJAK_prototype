from typing import Annotated, Literal

from fastapi import APIRouter, Depends, Query

from app.core.deps import DbSession
from app.domains.auth.deps import CurrentUser
from app.domains.welfare.repository import WelfareRepository
from app.domains.welfare.schemas import WelfareCenterOut, WelfareKind
from app.domains.welfare.service import WelfareService

router = APIRouter(prefix="/welfare", tags=["welfare"])


def get_welfare_service(session: DbSession) -> WelfareService:
    return WelfareService(WelfareRepository(session))


WelfareServiceDep = Annotated[WelfareService, Depends(get_welfare_service)]


@router.get("/nearby", response_model=list[WelfareCenterOut])
async def nearby(
    me: CurrentUser,
    service: WelfareServiceDep,
    kind: Annotated[WelfareKind | Literal["all"], Query()] = "all",
) -> list[WelfareCenterOut]:
    """가까운 복지시설 — 내 위치가 있으면 반경 5km 안 가까운 순, 없으면 같은 시·도"""
    found = await service.nearby(me, None if kind == "all" else kind)
    return [WelfareCenterOut.of(v) for v in found]


@router.get("/{center_id}", response_model=WelfareCenterOut)
async def detail(center_id: str, me: CurrentUser, service: WelfareServiceDep) -> WelfareCenterOut:
    return WelfareCenterOut.of(await service.detail(me, center_id))
