"""emergency 도메인: 보호자 연결·긴급 도움 기록 (C10).

- 보호자 전화번호는 users 처럼 AES-256-GCM 으로 암호화해 저장한다.
- 긴급 도움(SOS)은 지금은 기록만 — 문자·푸시 발송(C4)과 복지사 연계는 비어 있다.
  누구에게 알렸는지(알릴 대상)는 그 순간의 보호자 목록을 그대로 남긴다.
"""

import uuid
from datetime import datetime

from sqlalchemy import JSON, DateTime, ForeignKey, LargeBinary, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base

MAX_GUARDIANS = 3
NAME_MAX_LEN = 30
RELATION_MAX_LEN = 20


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
