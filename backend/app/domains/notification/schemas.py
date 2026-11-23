import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

from app.domains.notification.models import MAX_PER_DAY, TIME_SLOTS
from app.domains.notification.service import InboxItem, Prefs

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
