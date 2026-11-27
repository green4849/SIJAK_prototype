import uuid
from datetime import UTC, datetime

from sqlalchemy import delete, select, update
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.notification import push
from app.domains.notification.models import Notification, NotificationPrefs, PushSubscription
from app.integrations.webpush.base import PushTarget


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

    # ---------- 휴대폰 알림 구독 (C4) ----------

    async def push_targets(self, user_id: uuid.UUID) -> list[PushTarget]:
        rows = await self.session.scalars(
            select(PushSubscription).where(PushSubscription.user_id == user_id)
        )
        return [PushTarget(r.endpoint, r.p256dh, r.auth) for r in rows]

    def queue_push(self, targets: list[PushTarget], msg: "push.PushMessage") -> None:
        """이 세션이 커밋되면 보낸다 (rollback 이면 버림)"""
        push.queue(self.session, targets, msg)

    async def save_subscription(
        self, user_id: uuid.UUID, endpoint: str, p256dh: str, auth: str, keep: int
    ) -> None:
        """기기 구독 등록 — 같은 기기(endpoint)가 다른 계정이었으면 이 계정으로 옮긴다.
        한 사람에 keep 대까지, 넘으면 오래된 것부터 지운다."""
        now = datetime.now(UTC)
        await self.session.execute(
            insert(PushSubscription)
            .values(user_id=user_id, endpoint=endpoint, p256dh=p256dh, auth=auth, created_at=now)
            .on_conflict_do_update(
                index_elements=["endpoint"],
                set_={"user_id": user_id, "p256dh": p256dh, "auth": auth, "created_at": now},
            )
        )
        stale = (
            select(PushSubscription.id)
            .where(PushSubscription.user_id == user_id)
            .order_by(PushSubscription.created_at.desc(), PushSubscription.id)
            .offset(keep)
        )
        await self.session.execute(delete(PushSubscription).where(PushSubscription.id.in_(stale)))
        await self.session.commit()

    async def delete_subscription(self, user_id: uuid.UUID, endpoint: str) -> None:
        await self.session.execute(
            delete(PushSubscription).where(
                PushSubscription.user_id == user_id, PushSubscription.endpoint == endpoint
            )
        )
        await self.session.commit()

    async def push_delivered(self, ok: list[str], gone: list[str]) -> None:
        if gone:
            await self.session.execute(
                delete(PushSubscription).where(PushSubscription.endpoint.in_(gone))
            )
        if ok:
            await self.session.execute(
                update(PushSubscription)
                .where(PushSubscription.endpoint.in_(ok))
                .values(last_sent_at=datetime.now(UTC))
            )
        await self.session.commit()
