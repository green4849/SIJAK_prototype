import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.notification.models import NotificationPrefs


class NotificationRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get(self, user_id: uuid.UUID) -> NotificationPrefs | None:
        return await self.session.get(NotificationPrefs, user_id)

    async def save(self, prefs: NotificationPrefs) -> None:
        await self.session.merge(prefs)
        await self.session.commit()
