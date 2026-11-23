"""두뇌 운동 기록 (C13).

시간 제한·점수 대신 '연속 일수'와 '몇 번 만에·몇 개 맞혔어요'로 보여 준다.
"""

import uuid
from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone

from app.core.errors import DomainError
from app.domains.brain.repository import BrainRepository

KST = timezone(timedelta(hours=9))
# 연속 일수는 최근 이 날수까지만 거꾸로 센다 (그 이상은 '이만큼 넘게'로 충분)
STREAK_LOOKBACK_DAYS = 400


class InvalidBrainResultError(DomainError):
    status_code = 422
    code = "validation_error"


@dataclass(frozen=True)
class BestRecord:
    game: str
    text: str


@dataclass(frozen=True)
class BrainStats:
    streak_days: int
    today_done: bool
    #: 이번 주 월~일 한 날
    week: list[bool]
    best: list[BestRecord]


def kst_today() -> date:
    return datetime.now(KST).date()


def _best_text(game: str, value: int) -> str:
    if game == "match":
        return f"가장 적게 뒤집은 횟수 {value}번"
    return f"가장 많이 맞힌 문제 {value}개"


class BrainService:
    def __init__(self, repo: BrainRepository) -> None:
        self.repo = repo

    async def stats(self, user_id: uuid.UUID, today: date | None = None) -> BrainStats:
        today = today or kst_today()
        days = await self.repo.played_days(user_id, today - timedelta(days=STREAK_LOOKBACK_DAYS))
        # 연속 일수: 오늘 했으면 오늘부터, 아니면 어제부터 거꾸로
        d = today if today in days else today - timedelta(days=1)
        streak = 0
        while d in days:
            streak += 1
            d -= timedelta(days=1)
        monday = today - timedelta(days=today.weekday())
        week = [monday + timedelta(days=i) in days for i in range(7)]
        best = await self.repo.best(user_id)
        return BrainStats(
            streak_days=streak,
            today_done=today in days,
            week=week,
            best=[BestRecord(g, _best_text(g, best[g])) for g in ("match", "calc") if g in best],
        )

    async def record(self, user_id: uuid.UUID, game: str, score: int, total: int) -> BrainStats:
        if game == "calc" and score > total:
            raise InvalidBrainResultError("맞힌 개수가 문제 수보다 많아요.")
        if game == "match" and score < total:
            # 두 장씩 한 번 — 짝 n개를 찾으려면 적어도 n번은 뒤집어야 한다
            raise InvalidBrainResultError("뒤집은 횟수를 다시 확인해 주세요.")
        await self.repo.add(user_id, game, score, total)
        await self.repo.commit()
        return await self.stats(user_id)
