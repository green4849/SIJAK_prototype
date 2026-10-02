"""chat 도메인: 1:1 대화방과 메시지 (⑤)."""

import uuid
from datetime import datetime

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Integer,
    SmallInteger,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class ChatRoom(Base):
    """두 사람의 방은 하나 — user_a_id < user_b_id 로 정렬해 저장"""

    __tablename__ = "chat_rooms"
    __table_args__ = (
        UniqueConstraint("user_a_id", "user_b_id"),
        CheckConstraint("user_a_id < user_b_id", name="ordered_pair"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_a_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    user_b_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    # 각자 어디까지 읽었는지 (안 읽은 개수 계산용)
    a_last_read_id: Mapped[int] = mapped_column(BigInteger, default=0)
    b_last_read_id: Mapped[int] = mapped_column(BigInteger, default=0)
    last_message_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    def other(self, me: uuid.UUID) -> uuid.UUID:
        return self.user_b_id if me == self.user_a_id else self.user_a_id

    def has(self, user_id: uuid.UUID) -> bool:
        return user_id in (self.user_a_id, self.user_b_id)


class ChatMessage(Base):
    __tablename__ = "chat_messages"
    __table_args__ = (CheckConstraint("kind IN ('text', 'voice')", name="kind"),)

    # 순차 id — 폴링에서 "이 id 이후 메시지"로 조회
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    room_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("chat_rooms.id", ondelete="CASCADE"), index=True
    )
    sender_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    kind: Mapped[str] = mapped_column(String(10))
    body: Mapped[str] = mapped_column(Text, default="")
    audio_key: Mapped[str | None] = mapped_column(String(64))
    duration_sec: Mapped[int | None] = mapped_column(Integer)
    # 위험 대화 감지 결과 (risk 도메인 룰) — 받는 사람에게 경고로 보여 준다
    risk_level: Mapped[int] = mapped_column(SmallInteger, default=0, server_default="0")
    risk_labels: Mapped[str] = mapped_column(String(200), default="", server_default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
