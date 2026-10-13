"""notification 도메인: 알림 받는 방식 설정 (C12). 실제 발송은 C4 푸시 알림에서."""

import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, String, func
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
