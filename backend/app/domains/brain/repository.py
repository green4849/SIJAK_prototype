import uuid
from datetime import date

from sqlalchemy import Date, cast, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.brain.models import BrainResult

# 날짜는 한국 날짜로 센다 (자정 넘어 한 판도 '오늘'로)
_KST_DAY = cast(func.timezone("Asia/Seoul", BrainResult.created_at), Date)


class BrainRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def add(self, user_id: uuid.UUID, game: str, score: int, total: int) -> None:
        self.session.add(BrainResult(user_id=user_id, game=game, score=score, total=total))
        await self.session.flush()

    async def played_days(self, user_id: uuid.UUID, since: date) -> set[date]:
        """since(한국 날짜) 이후 한 판이라도 한 날"""
        q = select(_KST_DAY).where(BrainResult.user_id == user_id, _KST_DAY >= since).distinct()
        return set(await self.session.scalars(q))

    async def best(self, user_id: uuid.UUID) -> dict[str, int]:
        """게임별 최고 기록 — match 는 가장 적게 뒤집은 횟수, calc 는 가장 많이 맞힌 개수"""
        q = (
            select(BrainResult.game, func.min(BrainResult.score), func.max(BrainResult.score))
            .where(BrainResult.user_id == user_id)
            .group_by(BrainResult.game)
        )
        out: dict[str, int] = {}
        for game, lo, hi in await self.session.execute(q):
            out[game] = lo if game == "match" else hi
        return out

    async def commit(self) -> None:
        await self.session.commit()
