"""point 도메인: 포인트 원장 (C12).

잔액은 따로 저장하지 않고 원장 합계로 계산한다 — 기록이 곧 근거.
`ref` 는 같은 일로 두 번 적립·차감되지 않게 하는 키 (예: "rating:<상대 id>").
"""

import uuid
from datetime import datetime

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Integer,
    String,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base

# 사유 → 화면 문구. 순서는 화면 '모으는 방법'과 무관
REASONS = {
    "welcome": "가입 축하",
    "rating": "추천 친구 평가",
    "volunteer": "봉사모임 참여",
    "mission_first_friends": "첫 친구 3명 사귀기",
    "friend_request": "친구 신청",
}


class PointEntry(Base):
    __tablename__ = "point_entries"
    __table_args__ = (
        UniqueConstraint("user_id", "ref"),
        CheckConstraint(f"reason IN {tuple(REASONS)}", name="reason"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    amount: Mapped[int] = mapped_column(Integer)  # 적립 +, 사용 −, 무료 사용 0
    reason: Mapped[str] = mapped_column(String(30))
    ref: Mapped[str] = mapped_column(String(80))
    # 화면에 보일 한 줄 (예: "이순자님께 친구 신청") — 사람 이름이 바뀌어도 기록은 그때 그대로
    memo: Mapped[str] = mapped_column(String(100), default="", server_default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
