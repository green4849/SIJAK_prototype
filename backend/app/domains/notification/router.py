import uuid

from fastapi import APIRouter, status

from app.core.ratelimit import Rule, enforce
from app.domains.auth.deps import CurrentUser
from app.domains.notification.deps import NotificationServiceDep
from app.domains.notification.schemas import (
    NotificationItemOut,
    NotificationPrefsOut,
    NotificationPrefsUpdate,
    PushConfigOut,
    PushSubscriptionIn,
    PushTestOut,
    PushUnsubscribeIn,
)

router = APIRouter(prefix="/notifications", tags=["notification"])

PUSH_TEST_PER_USER = Rule("push_test:user", limit=5, window_sec=600, action="시험 알림 보내기")


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


# ---------- 휴대폰 알림 (C4) — '/{notification_id}' 보다 먼저 ----------


@router.get("/push", response_model=PushConfigOut)
async def push_config(me: CurrentUser, service: NotificationServiceDep) -> PushConfigOut:
    """서버가 휴대폰 알림을 보낼 수 있는지와 구독에 쓸 공개 키"""
    return PushConfigOut.of(service.push_config())


@router.put("/push/subscription", status_code=status.HTTP_204_NO_CONTENT)
async def push_subscribe(
    body: PushSubscriptionIn, me: CurrentUser, service: NotificationServiceDep
) -> None:
    """이 기기에서 알림 받기 — 같은 기기가 다른 계정이었으면 이 계정으로 옮긴다"""
    await service.subscribe_push(me.id, body.endpoint, body.keys.p256dh, body.keys.auth)


@router.post("/push/unsubscribe", status_code=status.HTTP_204_NO_CONTENT)
async def push_unsubscribe(
    body: PushUnsubscribeIn, me: CurrentUser, service: NotificationServiceDep
) -> None:
    """이 기기에서 알림 끄기 (내 구독만)"""
    await service.unsubscribe_push(me.id, body.endpoint)


@router.post("/push/test", response_model=PushTestOut)
async def push_test(me: CurrentUser, service: NotificationServiceDep) -> PushTestOut:
    """내 기기들로 시험 알림 한 통"""
    await enforce(PUSH_TEST_PER_USER, me.id)
    return PushTestOut.of(await service.test_push(me.id))


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
