"""wellbeing 도메인: 사회적 관계 지수 주간 기록 + 자가평가(PHQ-9·GAD-7) (C11).

- 지수는 조회할 때마다 활동 기록으로 새로 계산하고, 그 주(월요일 시작, 한국 날짜) 값을 덮어 쓴다
  → 지난 주들의 값이 남아 '4주 변화'가 된다.
- 자가평가는 고른 답(0~3)을 그대로 남긴다. 점수·단계는 답으로 다시 계산할 수 있다.
"""

import uuid
from datetime import date, datetime

from sqlalchemy import (
    JSON,
    BigInteger,
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    String,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base

ASSESSMENT_KINDS = ("phq9", "gad7")


class RelationIndexWeek(Base):
    __tablename__ = "relation_index_weeks"

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    # 그 주 월요일 (한국 날짜)
    week_start: Mapped[date] = mapped_column(Date, primary_key=True)
    score: Mapped[int] = mapped_column(Integer)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class SelfAssessment(Base):
    __tablename__ = "self_assessments"
    __table_args__ = (CheckConstraint(f"kind IN {ASSESSMENT_KINDS}", name="kind"),)

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    kind: Mapped[str] = mapped_column(String(10))
    answers: Mapped[list[int]] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
