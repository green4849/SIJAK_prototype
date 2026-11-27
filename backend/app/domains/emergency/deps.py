"""emergency 도메인 의존성 — admin 도 이걸로 EmergencyService 를 받는다."""

from typing import Annotated

from fastapi import Depends

from app.core.deps import DbSession
from app.domains.emergency.repository import EmergencyRepository
from app.domains.emergency.service import EmergencyService
from app.integrations.sms import get_sms_sender
from app.integrations.sms.base import SmsSender


def get_emergency_service(
    session: DbSession, sms: Annotated[SmsSender | None, Depends(get_sms_sender)]
) -> EmergencyService:
    return EmergencyService(EmergencyRepository(session), sms)


EmergencyServiceDep = Annotated[EmergencyService, Depends(get_emergency_service)]
