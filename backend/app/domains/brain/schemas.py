from typing import Literal

from pydantic import BaseModel, Field

from app.domains.brain.service import BrainStats

BrainGame = Literal["match", "calc"]  # models.GAMES


class BrainResultIn(BaseModel):
    game: BrainGame
    score: int = Field(
        ge=0, le=999, description="match: 뒤집은 횟수(적을수록 좋음) / calc: 맞힌 개수"
    )
    total: int = Field(ge=1, le=99, description="match: 짝 수 / calc: 문제 수")


class BrainBest(BaseModel):
    game: BrainGame
    text: str


class BrainStatsOut(BaseModel):
    streak_days: int = Field(description="연속으로 한 날 (한국 날짜)")
    today_done: bool
    week: list[bool] = Field(description="이번 주 한 날 — 길이 7, 월요일부터")
    best: list[BrainBest]

    @classmethod
    def of(cls, s: BrainStats) -> "BrainStatsOut":
        return cls(
            streak_days=s.streak_days,
            today_done=s.today_done,
            week=s.week,
            best=[BrainBest(game=b.game, text=b.text) for b in s.best],  # type: ignore[arg-type]
        )
