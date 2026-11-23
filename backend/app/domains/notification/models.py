"""notification 도메인: 알림 받는 방식 설정 (C12) + 알림함 (C4 일부).

알림함은 푸시로 보낼 소식을 앱 안에도 쌓아 둔 목록 — 푸시를 못 봤거나 꺼 둔 분도 볼 수 있게.
실제 발송(Web Push·FCM)은 C4.
"""

import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    String,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base

# 받는 시간 (한국 시각). 밤 9시~아침 8시에는 보내지 않는다
TIME_SLOTS = {"morning": "아침 9시", "noon": "점심 1시", "evening": "저녁 7시"}
MAX_PER_DAY = 2  # 추천 알림은 하루 2번까지 — 알림 피로 방지
DEFAULT_TIMES = ("morning", "evening")


class NotificationPrefs(Base):
    __tablename__ = "notification_prefs"

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    # 오늘의 추천 친구 알림
    recommend_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    # 쉼표 구분 TIME_SLOTS 키 (최대 MAX_PER_DAY개)
    recommend_times: Mapped[str] = mapped_column(String(40), default=",".join(DEFAULT_TIMES))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


# 알림 종류 → 화면 아이콘·색 (frontend features/inbox)
KINDS = ("friend", "activity", "safety", "wellbeing", "welfare", "points")
INBOX_LIMIT = 50  # 알림함에 보이는 최근 소식 수


class Notification(Base):
    __tablename__ = "notifications"
    __table_args__ = (
        CheckConstraint(f"kind IN {KINDS}", name="kind"),
        # 같은 일로 두 번 쌓이지 않게 (예: "friend_request:<보낸 사람 id>"). 없으면 매번 새로
        UniqueConstraint("user_id", "ref"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    kind: Mapped[str] = mapped_column(String(20))
    title: Mapped[str] = mapped_column(String(40))
    body: Mapped[str] = mapped_column(String(200))
    # 누르면 갈 앱 안 경로 (예: /friends, /chats/<id>)
    link: Mapped[str | None] = mapped_column(String(200))
    ref: Mapped[str | None] = mapped_column(String(80))
    read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
