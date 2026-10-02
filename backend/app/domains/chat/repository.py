import uuid
from datetime import UTC, datetime

from sqlalchemy import func, or_, select
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

    async def add_room(self, a: uuid.UUID, b: uuid.UUID) -> ChatRoom:
        lo, hi = sorted([a, b])
        room = ChatRoom(user_a_id=lo, user_b_id=hi)
        self.session.add(room)
        await self.session.flush()
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

    async def commit(self) -> None:
        await self.session.commit()
