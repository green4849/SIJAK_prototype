"""1:1 대화 (⑤). 친구끼리만 대화할 수 있다 — 낯선 사람의 접근을 막는 기본 안전장치."""

import asyncio
import uuid
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import TYPE_CHECKING

from app.core.config import get_settings
from app.core.errors import DomainError, ForbiddenError, NotFoundError
from app.core.storage import MediaStorage
from app.domains.auth.service import AuthService
from app.domains.chat.models import ChatMessage, ChatRoom
from app.domains.chat.repository import ChatRepository
from app.domains.chat.topics import Topic, suggest
from app.domains.friend.service import FriendService
from app.domains.notification.service import NotificationService
from app.domains.risk.service import RiskService

if TYPE_CHECKING:
    from app.domains.auth.models import User

TEXT_MAX = 500
# 보관 기간이 지나 파일을 지운 음성 — 대화 화면은 재생 대신 이 글을 보여 준다
VOICE_EXPIRED_TEXT = "🎤 보관 기간이 지나 지운 음성 메시지예요"
VOICE_EXPIRE_BATCH = 500
# 이 위험도(2 경고)부터 받는 사람 알림함에도 남긴다 — 1(주의: 서두르기·외부 링크)은 대화 화면 표시만
NOTIFY_RISK_LEVEL = 2
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
        storage: MediaStorage,
        notifications: NotificationService,
    ) -> None:
        self.repo = repo
        self.auth = auth
        self.friends = friends
        self.risk = risk
        self.storage = storage
        self.notifications = notifications

    # ---------- 방 ----------

    async def open_with(self, me: "User", other_id: uuid.UUID) -> ChatRoom:
        if await self.risk.is_blocked_between(me.id, other_id):
            raise ForbiddenError("차단 중인 분과는 대화할 수 없어요.", code="blocked")
        if not await self.friends.are_friends(me.id, other_id):
            raise ForbiddenError("친구가 된 분과만 대화할 수 있어요.", code="not_friends")
        room = await self.repo.get_or_create_room(me.id, other_id)
        await self.repo.commit()
        return room

    async def list_rooms(self, me: "User") -> list[RoomSummary]:
        previews = await self.repo.list_room_previews(me.id)
        others = await self.auth.get_users({r.other(me.id) for r, _, _ in previews})
        blocked = await self.risk.related_block_ids(me.id)
        out = []
        for r, last_message, unread in previews:
            other = others.get(r.other(me.id))
            if other is None:
                continue
            out.append(
                RoomSummary(
                    room=r,
                    other=other,
                    last_message=last_message,
                    unread=unread,
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
        if result.level >= NOTIFY_RISK_LEVEL:
            await self.notifications.on_risky_message(
                room.other(me.id), me.name, result.labels, room.id, msg.id
            )
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
        key = await asyncio.to_thread(self.storage.save, data, ext)
        msg = ChatMessage(
            room_id=room.id,
            sender_id=me.id,
            kind="voice",
            audio_key=key,
            duration_sec=max(1, min(duration_sec, 600)),
        )
        try:
            return await self._save(room, msg)
        except Exception:
            await self.repo.rollback()
            if not await self.repo.has_audio_key(key):
                await self.repo.queue_media_deletions([key])
                await self.repo.commit()
            raise

    async def voice_file(self, me: "User", message_id: int) -> tuple[bytes, str]:
        msg = await self.repo.get_message(message_id)
        if msg is None or msg.kind != "voice" or not msg.audio_key:
            raise NotFoundError("음성을 찾을 수 없어요.")
        await self._member_room(me, msg.room_id)
        try:
            data = await asyncio.to_thread(self.storage.read, msg.audio_key)
        except FileNotFoundError:
            raise NotFoundError("음성을 찾을 수 없어요.") from None
        ext = msg.audio_key.rsplit(".", 1)[-1]
        content_type = next(kind for kind, suffix in VOICE_TYPES.items() if suffix == ext)
        return data, content_type

    # ---------- 대화 주제 (C12) ----------

    async def topics(self, me: "User", room_id: uuid.UUID) -> list[Topic]:
        room = await self._member_room(me, room_id)
        other = (await self.auth.get_users({room.other(me.id)}))[room.other(me.id)]
        return suggest([i.category for i in me.interests], [i.category for i in other.interests])

    # ---------- 다른 도메인용 공개 메서드 ----------

    async def sent_count_since(self, me: "User", since: datetime) -> int:
        """since 이후 내가 이웃에게 보낸 메시지 수 (C11 사회적 관계 지수 '대화')"""
        rooms = await self.repo.list_rooms(me.id)
        return await self.repo.count_sent_since(me.id, [r.id for r in rooms], since)

    async def sender_in_my_room(self, me: "User", message_id: int) -> uuid.UUID:
        """내가 들어 있는 방의 메시지를 보낸 사람 — 신고할 때 그 메시지가 정말 상대 것인지 (H42).
        없는 메시지거나 남의 방이면 NotFoundError (있는지조차 알려 주지 않는다)."""
        msg = await self.repo.get_message(message_id)
        if msg is None:
            raise NotFoundError("메시지를 찾을 수 없어요.")
        await self._member_room(me, msg.room_id)
        return msg.sender_id

    # ---------- 예약 작업 (app/jobs.py) ----------

    async def expire_old_voice(self, now: datetime) -> int:
        """보관 기간(voice_retention_days)이 지난 음성 파일을 지운다. 메시지는 남기고 안내 글로.

        DB를 먼저 저장하고 파일을 지운다 — 파일 지우기가 실패해도 남는 건 쓰지 않는 파일뿐.
        """
        before = now - timedelta(days=get_settings().voice_retention_days)
        total = 0
        while batch := await self.repo.voice_older_than(before, VOICE_EXPIRE_BATCH):
            keys = [m.audio_key for m in batch if m.audio_key]
            for m in batch:
                m.audio_key = None
                m.body = VOICE_EXPIRED_TEXT
            await self.repo.queue_media_deletions(keys)
            await self.repo.commit()
            total += len(batch)
        await self.drain_media_deletions()
        return total

    async def voice_keys_in_rooms_of(self, user_id: uuid.UUID) -> list[str]:
        """탈퇴한 분을 지우기 전에 — 그 방들의 음성 파일 (방과 메시지는 DB에서 함께 지워진다)"""
        return await self.repo.voice_keys_in_rooms_of(user_id)

    async def queue_voice_deletions(self, keys: list[str]) -> None:
        await self.repo.queue_media_deletions(keys)

    async def drain_media_deletions(self) -> int:
        total = 0
        while batch := await self.repo.pending_media_deletions():
            for row in batch:
                await asyncio.to_thread(self.storage.delete, row.key)
                await self.repo.remove_media_deletion(row)
                await self.repo.commit()
                total += 1
        return total

    async def moderation_context(self, message_id: int) -> list[ChatMessage]:
        """신고 메시지 앞뒤 최대 5개. 운영자 권한은 admin router에서 확인한다."""
        return await self.repo.message_context(message_id)

    async def message_texts(self, ids: set[int]) -> dict[int, str]:
        """운영자 화면(B7)의 문제 메시지 일부.

        방 참여 확인을 하지 않는다 — 운영자 권한은 admin router 가 확인.
        """
        return await self.repo.message_bodies(ids)

    async def talked_friend_ids(self, me: "User") -> set[uuid.UUID]:
        """서로 한 번 이상 말을 주고받은 친구 (차단한 사람 제외)"""
        others = {r.other(me.id) for r in await self.repo.rooms_with_reply(me.id)}
        others -= await self.risk.related_block_ids(me.id)
        return {o for o in others if await self.friends.are_friends(me.id, o)}

    # ---------- 내부 ----------

    async def _sendable_room(self, me: "User", room_id: uuid.UUID) -> ChatRoom:
        room = await self._member_room(me, room_id)
        if await self.risk.is_blocked_between(me.id, room.other(me.id)):
            raise ForbiddenError("차단 중인 분께는 메시지를 보낼 수 없어요.", code="blocked")
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
