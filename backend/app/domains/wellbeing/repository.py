import uuid
from datetime import date

from sqlalchemy import delete, func, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.wellbeing.models import RelationIndexWeek, SelfAssessment


class WellbeingRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    # ---------- 사회적 관계 지수 ----------

    async def save_week(self, user_id: uuid.UUID, week_start: date, score: int) -> None:
        await self.session.execute(
            insert(RelationIndexWeek)
            .values(user_id=user_id, week_start=week_start, score=score)
            .on_conflict_do_update(
                index_elements=["user_id", "week_start"],
                set_={"score": score, "updated_at": func.now()},
            )
        )

    async def weeks_before(
        self, user_id: uuid.UUID, week_start: date, limit: int
    ) -> list[RelationIndexWeek]:
        """이번 주 전의 주들 — 오래된 것부터"""
        q = (
            select(RelationIndexWeek)
            .where(RelationIndexWeek.user_id == user_id, RelationIndexWeek.week_start < week_start)
            .order_by(RelationIndexWeek.week_start.desc())
            .limit(limit)
        )
        return list(reversed(list(await self.session.scalars(q))))

    async def weeks_since(self, since: date) -> list[RelationIndexWeek]:
        """since(월요일) 이후 모든 사람의 주별 값 — 운영자 돌봄 목록 (B7)"""
        q = select(RelationIndexWeek).where(RelationIndexWeek.week_start >= since)
        return list(await self.session.scalars(q))

    # ---------- 자가평가 ----------

    async def add_assessment(
        self, user_id: uuid.UUID, kind: str, answers: list[int]
    ) -> SelfAssessment:
        a = SelfAssessment(user_id=user_id, kind=kind, answers=answers)
        self.session.add(a)
        await self.session.flush()
        await self.session.refresh(a)
        return a

    async def assessments(self, user_id: uuid.UUID, limit: int) -> list[SelfAssessment]:
        q = (
            select(SelfAssessment)
            .where(SelfAssessment.user_id == user_id)
            .order_by(SelfAssessment.id.desc())
            .limit(limit)
        )
        return list(await self.session.scalars(q))

    async def assessments_of(
        self, user_id: uuid.UUID, kind: str, limit: int
    ) -> list[SelfAssessment]:
        """한 점검의 기록 — 새것부터"""
        q = (
            select(SelfAssessment)
            .where(SelfAssessment.user_id == user_id, SelfAssessment.kind == kind)
            .order_by(SelfAssessment.id.desc())
            .limit(limit)
        )
        return list(await self.session.scalars(q))

    async def delete_assessments(self, user_id: uuid.UUID) -> None:
        await self.session.execute(delete(SelfAssessment).where(SelfAssessment.user_id == user_id))

    async def last_assessment(self, user_id: uuid.UUID, kind: str) -> SelfAssessment | None:
        found = await self.assessments_of(user_id, kind, 1)
        return found[0] if found else None

    async def commit(self) -> None:
        await self.session.commit()
