import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

from app.domains.notification.models import MAX_PER_DAY, TIME_SLOTS
from app.domains.notification.service import InboxItem, Prefs, PushConfig, PushTestResult

TimeSlot = Literal["morning", "noon", "evening"]  # models.TIME_SLOTS


class TimeSlotOption(BaseModel):
    code: TimeSlot
    label: str


class NotificationPrefsOut(BaseModel):
    recommend_enabled: bool
    recommend_times: list[TimeSlot]
    max_per_day: int
    time_options: list[TimeSlotOption]
    quiet_hours: str = Field(description="알림을 보내지 않는 시간 안내 문구")

    @classmethod
    def of(cls, p: Prefs) -> "NotificationPrefsOut":
        return cls(
            recommend_enabled=p.recommend_enabled,
            recommend_times=p.recommend_times,  # type: ignore[arg-type]
            max_per_day=MAX_PER_DAY,
            time_options=[TimeSlotOption(code=k, label=v) for k, v in TIME_SLOTS.items()],  # type: ignore[arg-type]
            quiet_hours="밤 9시부터 아침 8시까지는 알림을 보내지 않아요",
        )


class NotificationPrefsUpdate(BaseModel):
    recommend_enabled: bool
    recommend_times: list[TimeSlot] = Field(max_length=len(TIME_SLOTS))


NotificationKind = Literal[
    "friend", "activity", "safety", "wellbeing", "welfare", "points"
]  # models.KINDS


class NotificationItemOut(BaseModel):
    id: uuid.UUID
    kind: NotificationKind
    title: str
    body: str
    created_at: datetime
    read: bool
    link: str | None = Field(description="누르면 갈 앱 안 경로 (없으면 null)")

    @classmethod
    def of(cls, n: InboxItem) -> "NotificationItemOut":
        return cls(
            id=n.id,
            kind=n.kind,  # type: ignore[arg-type]
            title=n.title,
            body=n.body,
            created_at=n.created_at,
            read=n.read,
            link=n.link,
        )


# ---------- 휴대폰 알림 (C4) ----------


class PushConfigOut(BaseModel):
    enabled: bool = Field(description="서버가 휴대폰 알림을 보낼 수 있는지")
    public_key: str | None = Field(description="브라우저 구독에 쓸 VAPID 공개 키 (enabled 일 때)")
    quiet_hours: str = Field(description="소리 없이 보내는 시간 안내 문구")

    @classmethod
    def of(cls, c: PushConfig) -> "PushConfigOut":
        return cls(
            enabled=c.enabled,
            public_key=c.public_key,
            quiet_hours="밤 9시부터 아침 8시까지는 소리·진동 없이 알려 드려요",
        )


class PushKeysIn(BaseModel):
    p256dh: str = Field(min_length=20, max_length=200)
    auth: str = Field(min_length=8, max_length=100)


class PushSubscriptionIn(BaseModel):
    """브라우저 PushSubscription.toJSON() 그대로 (expirationTime 은 쓰지 않음)"""

    endpoint: str = Field(max_length=1000)
    keys: PushKeysIn


class PushUnsubscribeIn(BaseModel):
    endpoint: str = Field(max_length=1000)


class PushTestOut(BaseModel):
    sent: int
    failed: int

    @classmethod
    def of(cls, r: PushTestResult) -> "PushTestOut":
        return cls(sent=r.sent, failed=r.failed)
