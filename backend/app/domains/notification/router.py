from typing import Annotated

from fastapi import APIRouter, Depends

from app.core.deps import DbSession
from app.domains.auth.deps import CurrentUser
from app.domains.notification.repository import NotificationRepository
from app.domains.notification.schemas import NotificationPrefsOut, NotificationPrefsUpdate
from app.domains.notification.service import NotificationService

router = APIRouter(prefix="/notifications", tags=["notification"])


def get_notification_service(session: DbSession) -> NotificationService:
    return NotificationService(NotificationRepository(session))


NotificationServiceDep = Annotated[NotificationService, Depends(get_notification_service)]


@router.get("/settings", response_model=NotificationPrefsOut)
async def get_settings(me: CurrentUser, service: NotificationServiceDep) -> NotificationPrefsOut:
    return NotificationPrefsOut.of(await service.get(me.id))


@router.put("/settings", response_model=NotificationPrefsOut)
async def update_settings(
    body: NotificationPrefsUpdate, me: CurrentUser, service: NotificationServiceDep
) -> NotificationPrefsOut:
    prefs = await service.update(me.id, body.recommend_enabled, list(body.recommend_times))
    return NotificationPrefsOut.of(prefs)
