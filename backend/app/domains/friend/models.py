"""friend 도메인: 친구 신청. 수락된 신청 = 친구 관계."""

import uuid
from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base

REQUEST_STATUSES = ("pending", "accepted", "declined")


class FriendRequest(Base):
    __tablename__ = "friend_requests"
    __table_args__ = (
        UniqueConstraint("from_user_id", "to_user_id"),
        CheckConstraint("from_user_id <> to_user_id", name="not_self"),
        CheckConstraint(f"status IN {REQUEST_STATUSES}", name="status"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    # 사용자 테이블은 auth 소유 — FK는 DB 무결성용, 코드에서는 auth 서비스로만 조회
    from_user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    to_user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    status: Mapped[str] = mapped_column(String(10), default="pending")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    responded_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


RATINGS = {"like": 1, "neutral": 0, "dislike": -1}  # 만나보고 싶어요 / 그저 그래요 / 잘 안 맞아요


class RecommendationRating(Base):
    """추천 친구 평가 (C12) — 다음 추천 순서에 반영. 상대에게는 알리지 않는다."""

    __tablename__ = "recommendation_ratings"
    __table_args__ = (
        UniqueConstraint("user_id", "target_id"),
        CheckConstraint("user_id <> target_id", name="not_self"),
        CheckConstraint(f"rating IN {tuple(RATINGS)}", name="rating"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    target_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    rating: Mapped[str] = mapped_column(String(10))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
