from fastapi import APIRouter

from app.domains.auth.deps import CurrentUser
from app.domains.point.deps import PointServiceDep
from app.domains.point.schemas import PointEntryOut, PointSummaryOut

router = APIRouter(prefix="/points", tags=["point"])


@router.get("", response_model=PointSummaryOut)
async def summary(me: CurrentUser, service: PointServiceDep) -> PointSummaryOut:
    return PointSummaryOut.of(await service.summary(me.id))


@router.get("/history", response_model=list[PointEntryOut])
async def history(me: CurrentUser, service: PointServiceDep) -> list[PointEntryOut]:
    return [PointEntryOut.of(e) for e in await service.history(me.id)]
