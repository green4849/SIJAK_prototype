"""알림 설정 (C12) + 알림함·휴대폰 알림 (C4).

- 설정: 회의 원안 '하루 3~4번 추천 푸시' → 하루 2번까지, 받는 시간을 직접 고른다.
  (추천 친구 알림을 그 시각에 보내는 일은 예약 작업이 필요해 다음 단계 — docs/tasks/C4)
- 알림함: 다른 도메인(friend·chat·activity)이 아래 `on_*` 메서드로 소식을 쌓는다.
  문구는 여기 한 곳에 모은다. 쌓기는 커밋하지 않는다 → 부른 쪽의 커밋과 함께 저장·취소된다.
- 휴대폰 알림(Web Push): 소식을 쌓을 때 같은 내용을 '커밋되면 보낼 것'으로 담는다 (push.py).
  메시지 내용은 알림에 넣지 않는다 — 잠금 화면에 대화가 보이지 않게.
"""

import uuid
from dataclasses import dataclass
from datetime import datetime

from app.core.config import get_settings
from app.core.errors import DomainError, NotFoundError
from app.domains.notification import push
from app.domains.notification.models import (
    DEFAULT_TIMES,
    INBOX_LIMIT,
    MAX_PER_DAY,
    MAX_PUSH_DEVICES,
    TIME_SLOTS,
    Notification,
    NotificationPrefs,
)
from app.domains.notification.push import PushMessage
from app.domains.notification.repository import NotificationRepository


class InvalidNotificationPrefsError(DomainError):
    status_code = 422
    code = "invalid_notification_prefs"


class InvalidPushSubscriptionError(DomainError):
    status_code = 422
    code = "invalid_push_subscription"


class PushDisabledError(DomainError):
    status_code = 409
    code = "push_disabled"


@dataclass(frozen=True)
class PushConfig:
    #: 서버가 휴대폰 알림을 보낼 수 있는지 (VAPID 키가 있는지)
    enabled: bool
    #: 브라우저 구독에 쓸 공개 키 (applicationServerKey)
    public_key: str | None


@dataclass(frozen=True)
class PushTestResult:
    sent: int
    failed: int


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

    # ---------- 휴대폰 알림 (C4) ----------

    def push_config(self) -> PushConfig:
        enabled = push.sender() is not None
        return PushConfig(enabled, get_settings().vapid_public_key if enabled else None)

    async def subscribe_push(
        self, user_id: uuid.UUID, endpoint: str, p256dh: str, auth: str
    ) -> None:
        if not push.allowed_endpoint(endpoint):
            raise InvalidPushSubscriptionError("이 브라우저의 알림 주소는 쓸 수 없어요.")
        await self.repo.save_subscription(user_id, endpoint, p256dh, auth, MAX_PUSH_DEVICES)

    async def unsubscribe_push(self, user_id: uuid.UUID, endpoint: str) -> None:
        await self.repo.delete_subscription(user_id, endpoint)

    async def test_push(self, user_id: uuid.UUID) -> PushTestResult:
        """설정 화면 '시험 알림 보내기' — 기다렸다가 결과를 알려 준다"""
        if push.sender() is None:
            raise PushDisabledError("아직 휴대폰 알림을 보낼 수 없어요.")
        targets = await self.repo.push_targets(user_id)
        if not targets:
            raise NotFoundError("이 계정으로 알림을 켠 기기가 없어요.")
        d = await push.send_now(
            targets,
            PushMessage(
                "시험 알림이에요",
                "이렇게 새 소식을 알려 드릴게요",
                "/me/settings",
                "test",
                ttl=600,
            ),
        )
        await push.record(d)
        return PushTestResult(d.sent, d.failed)

    async def _push(self, user_id: uuid.UUID, msg: PushMessage) -> None:
        """커밋되면 그 사람의 기기로 보내도록 담는다 (발송기가 꺼져 있으면 아무것도 안 함)"""
        if push.sender() is None:
            return
        self.repo.queue_push(await self.repo.push_targets(user_id), msg)

    async def _add(
        self,
        user_id: uuid.UUID,
        kind: str,
        title: str,
        body: str,
        link: str,
        ref: str,
        *,
        tag: str | None = None,
        notify: bool = True,
    ) -> bool:
        """알림함에 쌓고, 새로 쌓였으면 휴대폰 알림도 (같은 일은 한 번만)"""
        added = await self.repo.add(user_id, kind, title, body, link, ref)
        if added and notify:
            await self._push(user_id, PushMessage(title, body, link, tag or ref))
        return added

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
        await self._add(
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
        await self._add(
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
        await self._add(
            to_id,
            "safety",
            "조심하세요",
            f"{sender_name}님 메시지에 {what} 있어요",
            f"/chats/{room_id}",
            f"risk:{message_id}",
            tag=f"chat:{room_id}",
        )

    async def on_who5_due(self, user_id: uuid.UUID, last_id: int) -> bool:
        """WHO-5 4주 재측정 — 지난 점검 하나에 한 번만. 새로 쌓였으면 True"""
        return await self._add(
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
        # 휴대폰 알림은 보내지 않는다 — 방금 스스로 한 일
        await self._add(
            user_id,
            "activity",
            "신청한 활동",
            f"{title} · {schedule_text}",
            f"/activities/{activity_id}",
            f"activity:{activity_id}",
            notify=False,
        )

    async def on_activity_reminder(
        self, user_id: uuid.UUID, activity_id: uuid.UUID, title: str, day: str
    ) -> bool:
        """신청한 활동 전날 한 번만 알린다."""
        return await self._add(
            user_id,
            "activity",
            "내일 신청한 활동이 있어요",
            f"{title} · {day}",
            f"/activities/{activity_id}",
            f"activity_reminder:{activity_id}:{day}",
        )

    async def on_recommendation(self, user_id: uuid.UUID, day: str, slot: str) -> bool:
        """받기로 고른 시간에 새 이웃이 있을 때 하루 한 번만 알린다."""
        return await self._add(
            user_id,
            "friend",
            "동네 이웃 추천을 살펴보세요",
            "관심사가 맞는 이웃을 찾아봤어요",
            "/friends",
            f"recommend:{day}:{slot}",
        )

    async def on_new_message(self, to_id: uuid.UUID, sender_name: str, room_id: uuid.UUID) -> None:
        """새 메시지 — 휴대폰 알림만 (대화 목록이 곧 알림함). 내용은 넣지 않는다.
        같은 대화방 알림은 tag 로 하나로 합쳐진다."""
        await self._push(
            to_id,
            PushMessage(
                f"{sender_name}님이 메시지를 보냈어요",
                "눌러서 확인해 보세요",
                f"/chats/{room_id}",
                f"chat:{room_id}",
                ttl=12 * 3600,
                urgency="high",
            ),
        )
