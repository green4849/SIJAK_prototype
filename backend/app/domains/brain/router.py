from typing import Annotated

from fastapi import APIRouter, Depends, status

from app.core.deps import DbSession
from app.domains.auth.deps import CurrentUser
from app.domains.brain.repository import BrainRepository
from app.domains.brain.schemas import BrainResultIn, BrainStatsOut
from app.domains.brain.service import BrainService

router = APIRouter(prefix="/brain", tags=["brain"])


def get_brain_service(session: DbSession) -> BrainService:
    return BrainService(BrainRepository(session))


BrainServiceDep = Annotated[BrainService, Depends(get_brain_service)]


@router.get("/stats", response_model=BrainStatsOut)
async def stats(me: CurrentUser, service: BrainServiceDep) -> BrainStatsOut:
    return BrainStatsOut.of(await service.stats(me.id))


@router.post("/results", response_model=BrainStatsOut, status_code=status.HTTP_201_CREATED)
async def record(body: BrainResultIn, me: CurrentUser, service: BrainServiceDep) -> BrainStatsOut:
    """끝난 판 하나 기록 → 갱신된 기록을 돌려준다"""
    return BrainStatsOut.of(await service.record(me.id, body.game, body.score, body.total))
