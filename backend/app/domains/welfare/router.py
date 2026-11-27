from typing import Annotated, Literal

from fastapi import APIRouter, Depends, Query

from app.core.deps import DbSession
from app.domains.auth.deps import CurrentUser
from app.domains.welfare.repository import WelfareRepository
from app.domains.welfare.schemas import WelfareCenterOut, WelfareKind, WelfareSearchOut
from app.domains.welfare.service import WelfareService

router = APIRouter(prefix="/welfare", tags=["welfare"])


def get_welfare_service(session: DbSession) -> WelfareService:
    return WelfareService(WelfareRepository(session))


WelfareServiceDep = Annotated[WelfareService, Depends(get_welfare_service)]


KindQuery = Annotated[WelfareKind | Literal["all"], Query()]


@router.get("/search", response_model=WelfareSearchOut)
async def search(
    me: CurrentUser, service: WelfareServiceDep, kind: KindQuery = "all"
) -> WelfareSearchOut:
    """가까운 복지시설 + 어떻게 찾았는지(mode) — 5km → 10km → 20km, 그래도 없으면 가장 가까운 곳.
    내 위치가 없으면 같은 시·도. 화면은 mode 로 안내 문구를 고른다."""
    return WelfareSearchOut.of(await service.search(me, None if kind == "all" else kind))


@router.get("/nearby", response_model=list[WelfareCenterOut])
async def nearby(
    me: CurrentUser, service: WelfareServiceDep, kind: KindQuery = "all"
) -> list[WelfareCenterOut]:
    """(예전 화면용) /welfare/search 의 시설 목록만.

    배포 중 화면·서버 버전이 엇갈려도 깨지지 않게 둔다.
    """
    found = await service.nearby(me, None if kind == "all" else kind)
    return [WelfareCenterOut.of(v) for v in found]


@router.get("/{center_id}", response_model=WelfareCenterOut)
async def detail(center_id: str, me: CurrentUser, service: WelfareServiceDep) -> WelfareCenterOut:
    return WelfareCenterOut.of(await service.detail(me, center_id))
