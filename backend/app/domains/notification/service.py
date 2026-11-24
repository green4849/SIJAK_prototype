"""알림 설정 (C12) + 알림함 (C4 일부).

- 설정: 회의 원안 '하루 3~4번 추천 푸시' → 하루 2번까지, 받는 시간을 직접 고른다.
  실제 발송(Web Push·FCM)은 C4 — 발송기는 이 설정을 읽어 TIME_SLOTS 시각에만 보낸다.
- 알림함: 다른 도메인(friend·chat·activity)이 아래 `on_*` 메서드로 소식을 쌓는다.
  문구는 여기 한 곳에 모은다. 쌓기는 커밋하지 않는다 → 부른 쪽의 커밋과 함께 저장·취소된다.
"""

import uuid
from dataclasses import dataclass
from datetime import datetime

from app.core.errors import DomainError, NotFoundError
from app.domains.notification.models import (
    DEFAULT_TIMES,
    INBOX_LIMIT,
    MAX_PER_DAY,
    TIME_SLOTS,
    Notification,
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


@dataclass(frozen=True)
class InboxItem:
    id: uuid.UUID
    kind: str
    title: str
    body: str
    created_at: datetime
    read: bool
    link: str | None


def _with_subject_particle(word: str) -> str:
    """주격 조사 — 받침 있으면 '이', 없으면 '가' (이야기가 / 말이)"""
    last = word[-1]
    if "가" <= last <= "힣":
        return word + ("이" if (ord(last) - ord("가")) % 28 else "가")
    return word + "이(가)"


def _item(n: Notification) -> InboxItem:
    return InboxItem(
        id=n.id,
        kind=n.kind,
        title=n.title,
        body=n.body,
        created_at=n.created_at,
        read=n.read_at is not None,
        link=n.link,
    )


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

    # ---------- 알림함 ----------

    async def inbox(self, user_id: uuid.UUID) -> list[InboxItem]:
        return [_item(n) for n in await self.repo.recent(user_id, INBOX_LIMIT)]

    async def read(self, user_id: uuid.UUID, notification_id: uuid.UUID) -> None:
        if not await self.repo.mark_read(user_id, notification_id):
            raise NotFoundError("없는 알림이에요.")

    async def read_all(self, user_id: uuid.UUID) -> None:
        await self.repo.mark_all_read(user_id)

    # ---------- 다른 도메인용: 소식 쌓기 (커밋은 부른 쪽) ----------

    async def on_friend_request(self, to_id: uuid.UUID, from_id: uuid.UUID, from_name: str) -> None:
        await self.repo.add(
            to_id,
            "friend",
            "새 친구 신청",
            f"{from_name}님이 친구 신청을 보냈어요",
            "/friends",
            f"friend_request:{from_id}",
        )

    async def on_became_friends(
        self, to_id: uuid.UUID, other_id: uuid.UUID, other_name: str
    ) -> None:
        await self.repo.add(
            to_id,
            "friend",
            "친구가 되었어요",
            f"{other_name}님과 친구가 되었어요. 먼저 인사해 보세요",
            "/friends",
            f"friends:{other_id}",
        )

    async def on_risky_message(
        self,
        to_id: uuid.UUID,
        sender_name: str,
        labels: list[str],
        room_id: uuid.UUID,
        message_id: int,
    ) -> None:
        """위험 대화 감지 — 받는 사람에게 (대화 화면 경고와 같은 내용)"""
        what = _with_subject_particle(labels[0]) if labels else "조심할 말이"
        await self.repo.add(
            to_id,
            "safety",
            "조심하세요",
            f"{sender_name}님 메시지에 {what} 있어요",
            f"/chats/{room_id}",
            f"risk:{message_id}",
        )

    async def on_who5_due(self, user_id: uuid.UUID, last_id: int) -> bool:
        """WHO-5 4주 재측정 — 지난 점검 하나에 한 번만. 새로 쌓였으면 True"""
        return await self.repo.add(
            user_id,
            "wellbeing",
            "마음 건강 살펴볼 때예요",
            "지난 2주 동안의 기분을 질문 다섯 개로 살펴봐요",
            "/me/wellbeing/check/who5",
            f"who5_due:{last_id}",
        )

    async def on_activity_applied(
        self, user_id: uuid.UUID, activity_id: uuid.UUID, title: str, schedule_text: str
    ) -> None:
        await self.repo.add(
            user_id,
            "activity",
            "신청한 활동",
            f"{title} · {schedule_text}",
            f"/activities/{activity_id}",
            f"activity:{activity_id}",
        )
