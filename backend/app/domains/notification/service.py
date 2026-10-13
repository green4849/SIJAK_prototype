"""알림 설정 (C12). 회의 원안 '하루 3~4번 추천 푸시' → 하루 2번까지, 받는 시간을 직접 고른다.

실제 발송(Web Push·FCM)은 C4 — 발송기는 이 설정을 읽어 TIME_SLOTS 시각에만 보낸다.
"""

import uuid
from dataclasses import dataclass

from app.core.errors import DomainError
from app.domains.notification.models import (
    DEFAULT_TIMES,
    MAX_PER_DAY,
    TIME_SLOTS,
    NotificationPrefs,
)
from app.domains.notification.repository import NotificationRepository


class InvalidNotificationPrefsError(DomainError):
    status_code = 422
    code = "invalid_notification_prefs"


@dataclass(frozen=True)
class Prefs:
    recommend_enabled: bool
    #: TIME_SLOTS 순서대로
    recommend_times: list[str]


class NotificationService:
    def __init__(self, repo: NotificationRepository) -> None:
        self.repo = repo

    async def get(self, user_id: uuid.UUID) -> Prefs:
        row = await self.repo.get(user_id)
        if row is None:
            return Prefs(True, list(DEFAULT_TIMES))
        return Prefs(row.recommend_enabled, [t for t in row.recommend_times.split(",") if t])

    async def update(self, user_id: uuid.UUID, enabled: bool, times: list[str]) -> Prefs:
        ordered = [t for t in TIME_SLOTS if t in set(times)]
        if any(t not in TIME_SLOTS for t in times):
            raise InvalidNotificationPrefsError("받는 시간을 다시 골라 주세요.")
        if enabled and not ordered:
            raise InvalidNotificationPrefsError("받는 시간을 하나 이상 골라 주세요.")
        if len(ordered) > MAX_PER_DAY:
            raise InvalidNotificationPrefsError(f"하루 {MAX_PER_DAY}번까지 고를 수 있어요.")
        await self.repo.save(
            NotificationPrefs(
                user_id=user_id, recommend_enabled=enabled, recommend_times=",".join(ordered)
            )
        )
        return await self.get(user_id)
