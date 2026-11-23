import uuid
from datetime import UTC, datetime

from sqlalchemy import select, update
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.notification.models import Notification, NotificationPrefs


class NotificationRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    # ---------- 알림 설정 ----------

    async def get(self, user_id: uuid.UUID) -> NotificationPrefs | None:
        return await self.session.get(NotificationPrefs, user_id)

    async def save(self, prefs: NotificationPrefs) -> None:
        await self.session.merge(prefs)
        await self.session.commit()

    # ---------- 알림함 ----------

    async def add(
        self,
        user_id: uuid.UUID,
        kind: str,
        title: str,
        body: str,
        link: str | None,
        ref: str | None,
    ) -> bool:
        """같은 ref 가 이미 있으면 아무것도 안 하고 False. 커밋은 부른 쪽 트랜잭션에서"""
        result = await self.session.execute(
            insert(Notification)
            .values(user_id=user_id, kind=kind, title=title, body=body, link=link, ref=ref)
            .on_conflict_do_nothing(index_elements=["user_id", "ref"])
            .returning(Notification.id)
        )
        return result.scalar() is not None

    async def recent(self, user_id: uuid.UUID, limit: int) -> list[Notification]:
        q = (
            select(Notification)
            .where(Notification.user_id == user_id)
            .order_by(Notification.created_at.desc(), Notification.id)
            .limit(limit)
        )
        return list(await self.session.scalars(q))

    async def mark_read(self, user_id: uuid.UUID, notification_id: uuid.UUID) -> bool:
        """내 알림이면 읽음으로 (이미 읽었으면 그대로) — 없거나 남의 것이면 False"""
        n = await self.session.get(Notification, notification_id)
        if n is None or n.user_id != user_id:
            return False
        if n.read_at is None:
            n.read_at = datetime.now(UTC)
        await self.session.commit()
        return True

    async def mark_all_read(self, user_id: uuid.UUID) -> None:
        await self.session.execute(
            update(Notification)
            .where(Notification.user_id == user_id, Notification.read_at.is_(None))
            .values(read_at=datetime.now(UTC))
        )
        await self.session.commit()
