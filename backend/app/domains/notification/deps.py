"""notification 도메인 의존성 — friend·chat·activity 도 이걸로 알림함에 소식을 쌓는다."""

from typing import Annotated

from fastapi import Depends

from app.core.deps import DbSession
from app.domains.notification.repository import NotificationRepository
from app.domains.notification.service import NotificationService


def get_notification_service(session: DbSession) -> NotificationService:
    return NotificationService(NotificationRepository(session))


NotificationServiceDep = Annotated[NotificationService, Depends(get_notification_service)]
