from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

from app.domains.wellbeing.service import AssessmentForm, AssessmentResult, RelationIndex

RelationLevel = Literal["normal", "caution", "risk", "urgent"]
FactorCode = Literal["activity", "communication", "emotion", "social", "responsiveness"]
MoodLevel = Literal["calm", "mixed", "heavy", "none"]
AssessmentKind = Literal["phq9", "gad7"]  # models.ASSESSMENT_KINDS


class RelationFactor(BaseModel):
    code: FactorCode
    label: str
    score: int = Field(description="0~100, 높을수록 좋음")


class RelationWeek(BaseModel):
    label: str
    score: int


class MoodOut(BaseModel):
    """요즘 마음 — 최근 14일 말동무 대화의 정서 (보고서 4.5.2). 말동무 백엔드(C8) 전에는 none"""

    level: MoodLevel
    talked: int = Field(description="최근 14일 말동무에게 한 말 수 (정서를 읽은 것만)")
    heavy: int = Field(description="그중 슬픔·불안이 읽힌 말 수")
    crisis: bool = Field(description="최근 14일 안에 위기 신호가 있었는지")


class RelationIndexOut(BaseModel):
    score: int = Field(description="사회적 관계 지수 0~100, 높을수록 좋음 (= 100 − 고립 지수 II)")
    level: RelationLevel
    factors: list[RelationFactor]
    weekly: list[RelationWeek] = Field(description="지난 주들 → 이번 주 (마지막이 지금)")
    mood: MoodOut
    updated_at: datetime

    @classmethod
    def of(cls, r: RelationIndex) -> "RelationIndexOut":
        return cls(
            score=r.score,
            level=r.level,  # type: ignore[arg-type]
            factors=[
                RelationFactor(code=f.code, label=f.label, score=f.score)  # type: ignore[arg-type]
                for f in r.factors
            ],
            weekly=[RelationWeek(label=label, score=score) for label, score in r.weekly],
            mood=MoodOut(
                level=r.mood.level,  # type: ignore[arg-type]
                talked=r.mood.talked,
                heavy=r.mood.heavy,
                crisis=r.mood.crisis,
            ),
            updated_at=r.updated_at,
        )


class AssessmentQuestion(BaseModel):
    id: int
    text: str


class AssessmentOption(BaseModel):
    value: int
    label: str


class AssessmentFormOut(BaseModel):
    kind: AssessmentKind
    title: str
    lead: str = Field(description="'지난 2주 동안 …'")
    questions: list[AssessmentQuestion]
    options: list[AssessmentOption]

    @classmethod
    def of(cls, f: AssessmentForm) -> "AssessmentFormOut":
        return cls(
            kind=f.kind,  # type: ignore[arg-type]
            title=f.title,
            lead=f.lead,
            questions=[AssessmentQuestion(id=i + 1, text=t) for i, t in enumerate(f.questions)],
            options=[AssessmentOption(value=v, label=label) for v, label in f.options],
        )


class AssessmentIn(BaseModel):
    kind: AssessmentKind
    answers: list[int] = Field(max_length=20, description="문항 순서대로 0~3")


class AssessmentResultOut(BaseModel):
    id: int
    kind: AssessmentKind
    title: str
    score: int
    max_score: int
    level: Literal["minimal", "mild", "moderate", "severe"]
    level_label: str
    advice: str
    crisis: bool = Field(description="PHQ-9 9번(죽음·자해 생각)에 '있음' → 상담 전화 안내")
    created_at: datetime

    @classmethod
    def of(cls, r: AssessmentResult) -> "AssessmentResultOut":
        return cls(**r.__dict__)
