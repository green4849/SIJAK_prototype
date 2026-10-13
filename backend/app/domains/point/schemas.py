from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, Field

from app.domains.point.models import REASONS, PointEntry
from app.domains.point.service import PointSummary


class PointSummaryOut(BaseModel):
    """내 포인트와 지금 적용되는 규칙 — 화면 안내 문구는 이 값으로 만든다"""

    balance: int
    friend_request_cost: int
    next_request_free: bool = Field(description="다음 친구 신청이 무료인지 (첫 신청·무료 기간)")
    free_until: date | None = Field(description="체험 기간 마지막 날(한국 날짜). 없으면 null")
    rating_reward: int
    ratings_left_today: int
    volunteer_reward: int
    first_friends_reward: int

    @classmethod
    def of(cls, s: PointSummary) -> "PointSummaryOut":
        return cls(**s.__dict__)


class PointEntryOut(BaseModel):
    id: int
    amount: int
    reason: Literal[
        "welcome", "rating", "volunteer", "mission_first_friends", "friend_request"
    ]  # models.REASONS
    label: str  # 화면 문구: memo 가 있으면 memo, 없으면 사유 이름
    created_at: datetime

    @classmethod
    def of(cls, e: PointEntry) -> "PointEntryOut":
        return cls(
            id=e.id,
            amount=e.amount,
            reason=e.reason,  # type: ignore[arg-type]
            label=e.memo or REASONS.get(e.reason, e.reason),
            created_at=e.created_at,
        )
