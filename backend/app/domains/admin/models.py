"""admin 도메인: 운영자 처리 기록 (B7).

사건(case)은 따로 저장하지 않는다 — risk 의 위험 대화 기록(risk_events)과
신고(reports)가 곧 사건이고,
여기에는 운영자가 그 사건을 어떻게 처리했는지만 남긴다 (누가·언제·무엇을). 사건 상태 = 마지막 처리.
"""

import uuid
from datetime import datetime

from sqlalchemy import BigInteger, CheckConstraint, DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base

# 처리 → 사건 상태
ACTIONS = {"warn": "warned", "suspend": "suspended", "ban": "banned", "dismiss": "dismissed"}
SUSPEND_DAYS = 7  # 화면 '7일 정지'


class ModerationAction(Base):
    __tablename__ = "moderation_actions"
    __table_args__ = (CheckConstraint(f"action IN {tuple(ACTIONS)}", name="action"),)

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    # "auto-<risk_events.id>" 또는 "report-<reports.id>"
    case_id: Mapped[str] = mapped_column(String(50), index=True)
    action: Mapped[str] = mapped_column(String(10))
    target_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    # 운영자 계정이 지워져도 기록은 남긴다
    operator_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL")
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
