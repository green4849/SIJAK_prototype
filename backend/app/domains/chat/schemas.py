import uuid
from datetime import UTC, datetime
from typing import Literal

from pydantic import BaseModel, Field

from app.domains.auth.constants import REGIONS
from app.domains.auth.service import age_on
from app.domains.chat.models import ChatMessage
from app.domains.chat.service import TEXT_MAX, RoomSummary


class ChatPeer(BaseModel):
    user_id: uuid.UUID
    name: str
    age: int
    region_name: str


class MessageOut(BaseModel):
    id: int
    sender_id: uuid.UUID
    mine: bool
    kind: Literal["text", "voice"]
    body: str
    duration_sec: int | None
    audio_url: str | None
    created_at: datetime

    @classmethod
    def of(cls, m: ChatMessage, me: uuid.UUID, api_prefix: str) -> "MessageOut":
        return cls(
            id=m.id,
            sender_id=m.sender_id,
            mine=m.sender_id == me,
            kind=m.kind,  # type: ignore[arg-type]
            body=m.body,
            duration_sec=m.duration_sec,
            audio_url=f"{api_prefix}/chats/voice/{m.id}" if m.kind == "voice" else None,
            created_at=m.created_at,
        )


class RoomOut(BaseModel):
    id: uuid.UUID
    peer: ChatPeer
    last_message: str | None  # 목록 미리보기 문구
    last_message_at: datetime | None
    unread: int

    @classmethod
    def of(cls, s: RoomSummary) -> "RoomOut":
        u = s.other
        preview = None
        if s.last_message:
            preview = "🎤 음성 메시지" if s.last_message.kind == "voice" else s.last_message.body
        return cls(
            id=s.room.id,
            peer=ChatPeer(
                user_id=u.id,
                name=u.name,
                age=age_on(u.birth_date, datetime.now(UTC).date()),
                region_name=REGIONS.get(u.region_code, u.region_code),
            ),
            last_message=preview,
            last_message_at=s.room.last_message_at,
            unread=s.unread,
        )


class TextMessageCreate(BaseModel):
    text: str = Field(min_length=1, max_length=TEXT_MAX)
