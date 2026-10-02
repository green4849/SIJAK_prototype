"""activity 도메인: 지역 활동(복지관 프로그램·모임) ⑥⑦, 신청, 관심.

프로토타입은 시드 데이터 (docs/deferred.md §4 — 공공데이터 연동 자리)
"""

import uuid
from datetime import datetime

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base

CATEGORIES = {"culture": "문화·여가", "health": "건강", "learning": "배움"}


class Activity(Base):
    __tablename__ = "activities"
    __table_args__ = (
        CheckConstraint(f"category IN {tuple(CATEGORIES)}", name="category"),
        CheckConstraint("capacity > 0", name="capacity_positive"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    title: Mapped[str] = mapped_column(String(60))
    subtitle: Mapped[str] = mapped_column(String(120), default="")
    category: Mapped[str] = mapped_column(String(20), index=True)
    region_code: Mapped[str] = mapped_column(String(10), index=True)
    place: Mapped[str] = mapped_column(String(100))
    schedule_text: Mapped[str] = mapped_column(String(60))  # 목록용: "매주 화·목 오전 10시"
    starts_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    ends_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    capacity: Mapped[int] = mapped_column(Integer)
    description: Mapped[str] = mapped_column(Text, default="")
    # 그림 대신 아이콘 키 (walk·phone·movie·tea·music·craft·exercise·book·garden)
    image_kind: Mapped[str] = mapped_column(String(20), default="walk")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class ActivityApplication(Base):
    __tablename__ = "activity_applications"
    __table_args__ = (UniqueConstraint("activity_id", "user_id"),)

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    activity_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("activities.id", ondelete="CASCADE"), index=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class ActivityLike(Base):
    __tablename__ = "activity_likes"
    __table_args__ = (UniqueConstraint("activity_id", "user_id"),)

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    activity_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("activities.id", ondelete="CASCADE"), index=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
