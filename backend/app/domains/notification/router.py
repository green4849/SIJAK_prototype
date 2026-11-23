import uuid

from fastapi import APIRouter, status

from app.domains.auth.deps import CurrentUser
from app.domains.notification.deps import NotificationServiceDep
from app.domains.notification.schemas import (
    NotificationItemOut,
    NotificationPrefsOut,
    NotificationPrefsUpdate,
)

router = APIRouter(prefix="/notifications", tags=["notification"])


# ---------- 알림함 ----------


@router.get("", response_model=list[NotificationItemOut])
async def inbox(me: CurrentUser, service: NotificationServiceDep) -> list[NotificationItemOut]:
    """최근 소식 (새것부터, 50개까지)"""
    return [NotificationItemOut.of(n) for n in await service.inbox(me.id)]


@router.post("/read-all", status_code=status.HTTP_204_NO_CONTENT)
async def read_all(me: CurrentUser, service: NotificationServiceDep) -> None:
    await service.read_all(me.id)


@router.post("/{notification_id}/read", status_code=status.HTTP_204_NO_CONTENT)
async def read(
    notification_id: uuid.UUID, me: CurrentUser, service: NotificationServiceDep
) -> None:
    await service.read(me.id, notification_id)


# ---------- 알림 설정 (C12) ----------


@router.get("/settings", response_model=NotificationPrefsOut)
async def get_settings(me: CurrentUser, service: NotificationServiceDep) -> NotificationPrefsOut:
    return NotificationPrefsOut.of(await service.get(me.id))


@router.put("/settings", response_model=NotificationPrefsOut)
async def update_settings(
    body: NotificationPrefsUpdate, me: CurrentUser, service: NotificationServiceDep
) -> NotificationPrefsOut:
    prefs = await service.update(me.id, body.recommend_enabled, list(body.recommend_times))
    return NotificationPrefsOut.of(prefs)
