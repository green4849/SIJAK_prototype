"""brain 도메인: 두뇌 운동(인지 훈련) 기록 (C13).

게임은 화면에서만 돈다. 서버는 끝난 판의 결과만 받아 연속 일수·이번 주·최고 기록을 셈한다.
"""

import uuid
from datetime import datetime

from sqlalchemy import BigInteger, CheckConstraint, DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base

# match: 짝 맞추기 — score = 뒤집은 횟수(적을수록 좋음), total = 짝 수
# calc: 셈하기 — score = 맞힌 개수, total = 문제 수
GAMES = ("match", "calc")


class BrainResult(Base):
    __tablename__ = "brain_results"
    __table_args__ = (CheckConstraint(f"game IN {GAMES}", name="game"),)

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    game: Mapped[str] = mapped_column(String(10))
    score: Mapped[int] = mapped_column(Integer)
    total: Mapped[int] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
