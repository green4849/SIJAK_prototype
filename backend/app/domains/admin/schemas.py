import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

from app.domains.admin.service import Case, WatchItem

CaseStatus = Literal["open", "warned", "suspended", "banned", "dismissed"]
CaseAction = Literal["warn", "suspend", "ban", "dismiss"]  # models.ACTIONS


class AdminCaseOut(BaseModel):
    id: str = Field(description="auto-<위험 대화 기록 id> / report-<신고 id>")
    source: Literal["report", "auto"] = Field(description="report: 이웃 신고 / auto: 자동 감지")
    target_id: uuid.UUID
    target_name: str
    reasons: list[str]
    excerpt: str | None = Field(description="문제 메시지 일부")
    level: int = Field(description="1 주의 · 2 경고 · 3 위험")
    reports_count: int
    created_at: datetime
    status: CaseStatus

    @classmethod
    def of(cls, c: Case) -> "AdminCaseOut":
        return cls(**c.__dict__)


class CaseActionIn(BaseModel):
    action: CaseAction


class AdminWatchOut(BaseModel):
    user_id: uuid.UUID
    name: str
    age: int
    region_name: str
    relation_score: int = Field(description="사회적 관계 지수 0~100 — 낮을수록 돌봄이 필요")
    last_seen_text: str = Field(description="마지막 접속 '3일 전'")
    signal: str = Field(description="최근 신호")
    guardian_notified: bool = Field(
        description="최근 7일 안에 긴급 도움을 눌러 보호자에게 알렸는지"
    )

    @classmethod
    def of(cls, w: WatchItem) -> "AdminWatchOut":
        return cls(**w.__dict__)
