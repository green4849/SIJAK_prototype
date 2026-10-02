"""auth 도메인이 소유하는 테이블: users, user_interests, refresh_tokens.

보고서 ERD 대비 변경:
- isolation_score 는 wellbeing 도메인 소유 → users 에서 제외 (Stage 7)
- voice_features 는 범위 밖 → 제외
"""

import uuid
from datetime import date, datetime

from sqlalchemy import (
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    LargeBinary,
    String,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

USER_STATUSES = ("active", "suspended", "banned", "deleted")


class User(Base):
    __tablename__ = "users"
    __table_args__ = (
        CheckConstraint("gender IN ('M','F')", name="gender"),
        CheckConstraint(f"status IN {USER_STATUSES}", name="status"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(50))
    birth_date: Mapped[date] = mapped_column(Date)
    gender: Mapped[str] = mapped_column(String(1))
    phone_hash: Mapped[str] = mapped_column(String(64), unique=True)  # HMAC-SHA256
    phone_enc: Mapped[bytes] = mapped_column(LargeBinary)  # AES-256-GCM
    pass_ci: Mapped[str] = mapped_column(String(88), unique=True)
    region_code: Mapped[str] = mapped_column(String(10), index=True)
    status: Mapped[str] = mapped_column(String(20), default="active")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    interests: Mapped[list["UserInterest"]] = relationship(
        back_populates="user", cascade="all, delete-orphan", lazy="selectin"
    )


class UserInterest(Base):
    __tablename__ = "user_interests"
    __table_args__ = (UniqueConstraint("user_id", "category"),)

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    category: Mapped[str] = mapped_column(String(30))
    weight: Mapped[float] = mapped_column(default=1.0)

    user: Mapped[User] = relationship(back_populates="interests")


class RefreshToken(Base):
    """refresh 토큰 회전·폐기 추적 (로그아웃, 탈취 시 무효화)."""

    __tablename__ = "refresh_tokens"

    jti: Mapped[str] = mapped_column(String(32), primary_key=True)
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
