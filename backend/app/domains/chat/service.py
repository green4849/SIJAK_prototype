"""1:1 대화 (⑤). 친구끼리만 대화할 수 있다 — 낯선 사람의 접근을 막는 기본 안전장치."""

import uuid
from dataclasses import dataclass
from pathlib import Path
from typing import TYPE_CHECKING

from app.core.config import get_settings
from app.core.errors import DomainError, ForbiddenError, NotFoundError
from app.core.storage import LocalMediaStorage
from app.domains.auth.service import AuthService
from app.domains.chat.models import ChatMessage, ChatRoom
from app.domains.chat.repository import ChatRepository
from app.domains.friend.service import FriendService
from app.domains.risk.service import RiskService

if TYPE_CHECKING:
    from app.domains.auth.models import User

TEXT_MAX = 500
VOICE_TYPES = {"audio/webm": "webm", "audio/ogg": "ogg", "audio/mp4": "m4a", "audio/mpeg": "mp3"}


class InvalidMessageError(DomainError):
    status_code = 422
    code = "invalid_message"


@dataclass(frozen=True)
class RoomSummary:
    room: ChatRoom
    other: "User"
    last_message: ChatMessage | None
    unread: int
    blocked: bool = False


class ChatService:
    def __init__(
        self,
        repo: ChatRepository,
        auth: AuthService,
        friends: FriendService,
        risk: RiskService,
        storage: LocalMediaStorage,
    ) -> None:
        self.repo = repo
        self.auth = auth
        self.friends = friends
        self.risk = risk
        self.storage = storage

    # ---------- 방 ----------

    async def open_with(self, me: "User", other_id: uuid.UUID) -> ChatRoom:
        if await self.risk.is_blocked_between(me.id, other_id):
            raise ForbiddenError("차단한(된) 분과는 대화할 수 없어요.", code="blocked")
        if not await self.friends.are_friends(me.id, other_id):
            raise ForbiddenError("친구가 된 분과만 대화할 수 있어요.", code="not_friends")
        room = await self.repo.get_or_create_room(me.id, other_id)
        await self.repo.commit()
        return room

    async def list_rooms(self, me: "User") -> list[RoomSummary]:
        rooms = await self.repo.list_rooms(me.id)
        others = await self.auth.get_users({r.other(me.id) for r in rooms})
        blocked = await self.risk.related_block_ids(me.id)
        out = []
        for r in rooms:
            other = others.get(r.other(me.id))
            if other is None:
                continue
            out.append(
                RoomSummary(
                    room=r,
                    other=other,
                    last_message=await self.repo.last_message(r.id),
                    unread=await self.repo.count_unread(r, me.id),
                    blocked=r.other(me.id) in blocked,
                )
            )
        return out

    async def get_room(self, me: "User", room_id: uuid.UUID) -> RoomSummary:
        room = await self._member_room(me, room_id)
        other = (await self.auth.get_users({room.other(me.id)}))[room.other(me.id)]
        blocked = await self.risk.is_blocked_between(me.id, other.id)
        return RoomSummary(room, other, None, 0, blocked)

    # ---------- 메시지 ----------

    async def messages(
        self, me: "User", room_id: uuid.UUID, after_id: int = 0
    ) -> list[ChatMessage]:
        """조회하면 읽음 처리까지 한다"""
        room = await self._member_room(me, room_id)
        msgs = await self.repo.list_messages(room.id, after_id)
        if msgs:
            self.repo.mark_read(room, me.id, msgs[-1].id)
            await self.repo.commit()
        return msgs

    async def send_text(self, me: "User", room_id: uuid.UUID, text: str) -> ChatMessage:
        room = await self._sendable_room(me, room_id)
        body = text.strip()
        if not body:
            raise InvalidMessageError("보낼 내용을 적어 주세요.")
        if len(body) > TEXT_MAX:
            raise InvalidMessageError(f"한 번에 {TEXT_MAX}자까지 보낼 수 있어요.")
        msg = await self.repo.add_message(
            room, ChatMessage(room_id=room.id, sender_id=me.id, kind="text", body=body)
        )
        # 위험 대화 감지 (1단계 룰) — 받는 사람 화면에 경고로 노출
        result = self.risk.assess_message(me.id, msg.id, body)
        msg.risk_level = result.level
        msg.risk_labels = ",".join(result.labels)
        return await self._save(room, msg)

    async def send_voice(
        self, me: "User", room_id: uuid.UUID, data: bytes, content_type: str, duration_sec: int
    ) -> ChatMessage:
        # 음성은 STT가 없어 위험 감지 대상이 아님 (docs/deferred.md §3)
        room = await self._sendable_room(me, room_id)
        base_type = content_type.split(";")[0].strip()
        ext = VOICE_TYPES.get(base_type)
        if ext is None:
            raise InvalidMessageError("음성 파일 형식을 알 수 없어요.")
        if not data:
            raise InvalidMessageError("녹음된 소리가 없어요. 다시 녹음해 주세요.")
        if len(data) > get_settings().voice_max_bytes:
            raise InvalidMessageError("음성이 너무 길어요. 조금 짧게 나눠서 보내 주세요.")
        key = self.storage.save(data, ext)
        msg = ChatMessage(
            room_id=room.id,
            sender_id=me.id,
            kind="voice",
            audio_key=key,
            duration_sec=max(1, min(duration_sec, 600)),
        )
        return await self._save(room, msg)

    async def voice_file(self, me: "User", message_id: int) -> Path:
        msg = await self.repo.get_message(message_id)
        if msg is None or msg.kind != "voice" or not msg.audio_key:
            raise NotFoundError("음성을 찾을 수 없어요.")
        await self._member_room(me, msg.room_id)
        return self.storage.path(msg.audio_key)

    # ---------- 내부 ----------

    async def _sendable_room(self, me: "User", room_id: uuid.UUID) -> ChatRoom:
        room = await self._member_room(me, room_id)
        if await self.risk.is_blocked_between(me.id, room.other(me.id)):
            raise ForbiddenError("차단한(된) 분께는 메시지를 보낼 수 없어요.", code="blocked")
        return room

    async def _save(self, room: ChatRoom, msg: ChatMessage) -> ChatMessage:
        saved = msg if msg.id else await self.repo.add_message(room, msg)
        self.repo.mark_read(room, msg.sender_id, saved.id)  # 내가 보낸 건 읽은 것
        await self.repo.commit()
        return saved

    async def _member_room(self, me: "User", room_id: uuid.UUID) -> ChatRoom:
        room = await self.repo.get_room(room_id)
        if room is None or not room.has(me.id):
            raise NotFoundError("대화방을 찾을 수 없어요.")
        return room
