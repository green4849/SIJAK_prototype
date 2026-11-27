"""emergency 도메인: 보호자 연결·긴급 도움 기록 (C10).

- 보호자 전화번호는 users 처럼 AES-256-GCM 으로 암호화해 저장한다.
- 긴급 도움(SOS)은 기록하고, 문자 발송이 켜져 있으면(SMS_PROVIDER) 보호자마다 문자를 보낸다.
  보호자별 발송 결과는 sos_deliveries 에 — 실패하면 예약 작업이 다시 보낸다.
  알릴 대상(notified)은 그 순간의 보호자 목록을 그대로 남긴다. 푸시(C4)·복지사 연계는 아직.
"""

import uuid
from datetime import datetime

from sqlalchemy import JSON, DateTime, ForeignKey, Integer, LargeBinary, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base

MAX_GUARDIANS = 3
NAME_MAX_LEN = 30
RELATION_MAX_LEN = 20
#: 한 보호자에게 문자를 보내 보는 최대 횟수 (요청 때 + 예약 작업 재시도)
MAX_SMS_ATTEMPTS = 3


class Guardian(Base):
    __tablename__ = "guardians"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    name: Mapped[str] = mapped_column(String(NAME_MAX_LEN))
    # 아들·딸·배우자·형제자매·담당 복지사·이웃 (화면 선택지) — 자유 문구도 받는다
    relation: Mapped[str] = mapped_column(String(RELATION_MAX_LEN))
    phone_enc: Mapped[bytes] = mapped_column(LargeBinary)  # AES-256-GCM
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class SosEvent(Base):
    __tablename__ = "sos_events"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    # 알릴 대상 [{name, relation}] — 그때의 보호자 목록 (전화번호는 남기지 않는다)
    notified: Mapped[list[dict[str, str]]] = mapped_column(JSON, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class SosDelivery(Base):
    """긴급 도움 문자 한 통 — 보호자 한 명당 한 줄.

    pending → sent | failed (재시도하면 failed → sent 도 된다)
    """

    __tablename__ = "sos_deliveries"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    sos_event_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("sos_events.id", ondelete="CASCADE"), index=True
    )
    guardian_name: Mapped[str] = mapped_column(String(NAME_MAX_LEN))
    relation: Mapped[str] = mapped_column(String(RELATION_MAX_LEN))
    # 보낼 번호 — 그 순간의 보호자 번호 (보호자를 나중에 빼도 재시도할 수 있게). AES-256-GCM
    phone_enc: Mapped[bytes] = mapped_column(LargeBinary)
    # 보낸 본문 그대로 (재시도 때 같은 글)
    text: Mapped[str] = mapped_column(String(200))
    status: Mapped[str] = mapped_column(String(10), default="pending")  # pending|sent|failed
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    provider: Mapped[str] = mapped_column(String(20))
    provider_message_id: Mapped[str | None] = mapped_column(String(100))
    # 실패 이유 (번호·본문은 넣지 않는다)
    last_error: Mapped[str | None] = mapped_column(String(200))
    sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
