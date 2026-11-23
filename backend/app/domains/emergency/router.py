import uuid

from fastapi import APIRouter, status

from app.domains.auth.deps import CurrentUser
from app.domains.emergency.deps import EmergencyServiceDep
from app.domains.emergency.schemas import GuardianIn, GuardianOut, SosOut

router = APIRouter(tags=["emergency"])


@router.get("/me/guardians", response_model=list[GuardianOut])
async def list_guardians(me: CurrentUser, service: EmergencyServiceDep) -> list[GuardianOut]:
    return [GuardianOut.of(g) for g in await service.guardians(me.id)]


@router.post("/me/guardians", response_model=GuardianOut, status_code=status.HTTP_201_CREATED)
async def add_guardian(
    body: GuardianIn, me: CurrentUser, service: EmergencyServiceDep
) -> GuardianOut:
    return GuardianOut.of(await service.add_guardian(me.id, body.name, body.relation, body.phone))


@router.delete("/me/guardians/{guardian_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_guardian(
    guardian_id: uuid.UUID, me: CurrentUser, service: EmergencyServiceDep
) -> None:
    await service.remove_guardian(me.id, guardian_id)


@router.post("/emergency/sos", response_model=SosOut, status_code=status.HTTP_201_CREATED)
async def sos(me: CurrentUser, service: EmergencyServiceDep) -> SosOut:
    """긴급 도움 요청 — 지금은 기록만 (보호자·복지사 알림 발송은 C4)"""
    return SosOut.of(await service.sos(me.id))
