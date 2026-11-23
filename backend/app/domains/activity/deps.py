"""activity 도메인 의존성 — wellbeing 도 이걸로 ActivityService 를 받는다."""

from typing import Annotated

from fastapi import Depends

from app.core.deps import DbSession
from app.domains.activity.repository import ActivityRepository
from app.domains.activity.service import ActivityService
from app.domains.notification.deps import NotificationServiceDep
from app.domains.point.deps import PointServiceDep


def get_activity_service(
    session: DbSession, points: PointServiceDep, notifications: NotificationServiceDep
) -> ActivityService:
    return ActivityService(ActivityRepository(session), points, notifications)


ActivityServiceDep = Annotated[ActivityService, Depends(get_activity_service)]
