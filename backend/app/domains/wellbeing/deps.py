"""wellbeing 도메인 의존성 — admin 도 이걸로 WellbeingService 를 받는다."""

from typing import Annotated

from fastapi import Depends

from app.core.deps import DbSession
from app.domains.activity.deps import ActivityServiceDep
from app.domains.chat.deps import ChatServiceDep
from app.domains.friend.deps import FriendServiceDep
from app.domains.notification.deps import NotificationServiceDep
from app.domains.wellbeing.repository import WellbeingRepository
from app.domains.wellbeing.service import WellbeingService


def get_wellbeing_service(
    session: DbSession,
    chat: ChatServiceDep,
    friends: FriendServiceDep,
    activities: ActivityServiceDep,
    notifications: NotificationServiceDep,
) -> WellbeingService:
    return WellbeingService(WellbeingRepository(session), chat, friends, activities, notifications)


WellbeingServiceDep = Annotated[WellbeingService, Depends(get_wellbeing_service)]
