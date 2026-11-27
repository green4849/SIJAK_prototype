import uuid

from fastapi import APIRouter, status

from app.core.ratelimit import Rule, enforce
from app.domains.auth.deps import CurrentUser
from app.domains.emergency.deps import EmergencyServiceDep
from app.domains.emergency.schemas import EmergencyInfoOut, GuardianIn, GuardianOut, SosOut

router = APIRouter(tags=["emergency"])

# 문자가 나가므로 연달아 누르는 것을 막는다 — 막혀도 화면의 '바로 전화하기'는 그대로 쓸 수 있다
SOS_PER_USER = Rule("sos:user", limit=3, window_sec=600, action="긴급 도움 요청")


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


@router.get("/emergency", response_model=EmergencyInfoOut)
async def emergency_info(me: CurrentUser, service: EmergencyServiceDep) -> EmergencyInfoOut:
    """확인 창에서 '문자로 알려요'와 '기록만 해요' 중 무엇을 말할지"""
    return EmergencyInfoOut(sms_enabled=service.sms_enabled)


@router.post("/emergency/sos", response_model=SosOut, status_code=status.HTTP_201_CREATED)
async def sos(me: CurrentUser, service: EmergencyServiceDep) -> SosOut:
    """긴급 도움 요청 — 기록하고, 문자 발송이 켜져 있으면 보호자마다 문자 (결과는 보호자별로)"""
    await enforce(SOS_PER_USER, me.id)
    return SosOut.of(await service.sos(me.id, me.name, me.phone_enc))
