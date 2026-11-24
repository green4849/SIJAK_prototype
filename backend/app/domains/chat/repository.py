import uuid
from datetime import UTC, datetime

from sqlalchemy import func, or_, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.chat.models import ChatMessage, ChatRoom


class ChatRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    # ---- rooms ----

    async def get_room(self, room_id: uuid.UUID) -> ChatRoom | None:
        return await self.session.get(ChatRoom, room_id)

    async def get_room_between(self, a: uuid.UUID, b: uuid.UUID) -> ChatRoom | None:
        lo, hi = sorted([a, b])
        q = select(ChatRoom).where(ChatRoom.user_a_id == lo, ChatRoom.user_b_id == hi)
        return await self.session.scalar(q)

    async def get_or_create_room(self, a: uuid.UUID, b: uuid.UUID) -> ChatRoom:
        """동시에 두 번 열려도(더블 탭 등) 방은 하나 — DB에서 원자적으로 처리"""
        lo, hi = sorted([a, b])
        await self.session.execute(
            insert(ChatRoom)
            .values(id=uuid.uuid4(), user_a_id=lo, user_b_id=hi, a_last_read_id=0, b_last_read_id=0)
            .on_conflict_do_nothing(index_elements=["user_a_id", "user_b_id"])
        )
        room = await self.get_room_between(lo, hi)
        assert room is not None
        return room

    async def list_rooms(self, user_id: uuid.UUID) -> list[ChatRoom]:
        q = (
            select(ChatRoom)
            .where(or_(ChatRoom.user_a_id == user_id, ChatRoom.user_b_id == user_id))
            .order_by(ChatRoom.last_message_at.desc().nulls_last(), ChatRoom.created_at.desc())
        )
        return list(await self.session.scalars(q))

    # ---- messages ----

    async def get_message(self, message_id: int) -> ChatMessage | None:
        return await self.session.get(ChatMessage, message_id)

    async def list_messages(
        self, room_id: uuid.UUID, after_id: int = 0, limit: int = 100
    ) -> list[ChatMessage]:
        q = select(ChatMessage).where(ChatMessage.room_id == room_id)
        if after_id:
            q = q.where(ChatMessage.id > after_id).order_by(ChatMessage.id).limit(limit)
            return list(await self.session.scalars(q))
        # 처음 열 때는 최근 limit개
        rows = await self.session.scalars(q.order_by(ChatMessage.id.desc()).limit(limit))
        return list(reversed(list(rows)))

    async def last_message(self, room_id: uuid.UUID) -> ChatMessage | None:
        q = (
            select(ChatMessage)
            .where(ChatMessage.room_id == room_id)
            .order_by(ChatMessage.id.desc())
            .limit(1)
        )
        return await self.session.scalar(q)

    async def count_unread(self, room: ChatRoom, me: uuid.UUID) -> int:
        last_read = room.a_last_read_id if me == room.user_a_id else room.b_last_read_id
        q = select(func.count()).where(
            ChatMessage.room_id == room.id,
            ChatMessage.id > last_read,
            ChatMessage.sender_id != me,
        )
        return int(await self.session.scalar(q) or 0)

    async def add_message(self, room: ChatRoom, msg: ChatMessage) -> ChatMessage:
        self.session.add(msg)
        room.last_message_at = datetime.now(UTC)
        await self.session.flush()
        return msg

    def mark_read(self, room: ChatRoom, me: uuid.UUID, up_to_id: int) -> None:
        if me == room.user_a_id:
            room.a_last_read_id = max(room.a_last_read_id, up_to_id)
        else:
            room.b_last_read_id = max(room.b_last_read_id, up_to_id)

    async def rooms_with_reply(self, user_id: uuid.UUID) -> list[ChatRoom]:
        """두 사람이 모두 한 번 이상 말한 방 (C12 첫 친구 미션)"""
        talked = (
            select(ChatMessage.room_id)
            .group_by(ChatMessage.room_id)
            .having(func.count(func.distinct(ChatMessage.sender_id)) >= 2)
        )
        q = select(ChatRoom).where(
            or_(ChatRoom.user_a_id == user_id, ChatRoom.user_b_id == user_id),
            ChatRoom.id.in_(talked),
        )
        return list(await self.session.scalars(q))

    async def count_sent_since(
        self, user_id: uuid.UUID, room_ids: list[uuid.UUID], since: datetime
    ) -> int:
        if not room_ids:
            return 0
        q = select(func.count()).where(
            ChatMessage.room_id.in_(room_ids),
            ChatMessage.sender_id == user_id,
            ChatMessage.created_at >= since,
        )
        return int(await self.session.scalar(q) or 0)

    async def voice_older_than(self, before: datetime, limit: int) -> list[ChatMessage]:
        """파일이 남아 있는 오래된 음성 메시지 (B3 보관 기간)"""
        q = (
            select(ChatMessage)
            .where(
                ChatMessage.kind == "voice",
                ChatMessage.audio_key.is_not(None),
                ChatMessage.created_at < before,
            )
            .order_by(ChatMessage.id)
            .limit(limit)
        )
        return list(await self.session.scalars(q))

    async def voice_keys_in_rooms_of(self, user_id: uuid.UUID) -> list[str]:
        """이 사람이 들어 있는 방의 음성 파일 (방이 지워질 때 같이 지울 것)"""
        rooms = select(ChatRoom.id).where(
            or_(ChatRoom.user_a_id == user_id, ChatRoom.user_b_id == user_id)
        )
        q = select(ChatMessage.audio_key).where(
            ChatMessage.room_id.in_(rooms), ChatMessage.audio_key.is_not(None)
        )
        return [k for k in await self.session.scalars(q) if k]

    async def message_bodies(self, ids: set[int]) -> dict[int, str]:
        if not ids:
            return {}
        q = select(ChatMessage.id, ChatMessage.body).where(ChatMessage.id.in_(ids))
        return {i: b for i, b in await self.session.execute(q) if b}

    async def commit(self) -> None:
        await self.session.commit()
