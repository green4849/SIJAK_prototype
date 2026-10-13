from typing import Annotated

from fastapi import APIRouter, Depends

from app.domains.auth.deps import CurrentUser
from app.domains.chat.deps import ChatServiceDep
from app.domains.mission.schemas import MissionOut
from app.domains.mission.service import MissionCode, MissionService
from app.domains.point.deps import PointServiceDep

router = APIRouter(prefix="/missions", tags=["mission"])


def get_mission_service(chat: ChatServiceDep, points: PointServiceDep) -> MissionService:
    return MissionService(chat, points)


MissionServiceDep = Annotated[MissionService, Depends(get_mission_service)]


@router.get("", response_model=list[MissionOut])
async def missions(me: CurrentUser, service: MissionServiceDep) -> list[MissionOut]:
    return [MissionOut.of(m) for m in await service.list(me)]


@router.post("/{code}/claim", response_model=MissionOut)
async def claim(code: MissionCode, me: CurrentUser, service: MissionServiceDep) -> MissionOut:
    return MissionOut.of(await service.claim(me, code))
