import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, Query, UploadFile
from fastapi.responses import FileResponse

from app.core.config import get_settings
from app.core.deps import DbSession, MediaStorage
from app.domains.auth.deps import AuthServiceDep, CurrentUser
from app.domains.chat.repository import ChatRepository
from app.domains.chat.schemas import MessageOut, RoomOut, TextMessageCreate
from app.domains.chat.service import ChatService
from app.domains.friend.deps import FriendServiceDep
from app.domains.risk.deps import RiskServiceDep

router = APIRouter(prefix="/chats", tags=["chat"])
PREFIX = get_settings().api_prefix


def get_chat_service(
    session: DbSession,
    auth: AuthServiceDep,
    friends: FriendServiceDep,
    risk: RiskServiceDep,
    storage: MediaStorage,
) -> ChatService:
    return ChatService(ChatRepository(session), auth, friends, risk, storage)


ChatServiceDep = Annotated[ChatService, Depends(get_chat_service)]


@router.post("/with/{user_id}", response_model=RoomOut)
async def open_with(user_id: uuid.UUID, me: CurrentUser, service: ChatServiceDep) -> RoomOut:
    room = await service.open_with(me, user_id)
    return RoomOut.of(await service.get_room(me, room.id))


@router.get("", response_model=list[RoomOut])
async def list_rooms(me: CurrentUser, service: ChatServiceDep) -> list[RoomOut]:
    return [RoomOut.of(s) for s in await service.list_rooms(me)]


@router.get("/{room_id}", response_model=RoomOut)
async def get_room(room_id: uuid.UUID, me: CurrentUser, service: ChatServiceDep) -> RoomOut:
    return RoomOut.of(await service.get_room(me, room_id))


@router.get("/{room_id}/messages", response_model=list[MessageOut])
async def messages(
    room_id: uuid.UUID,
    me: CurrentUser,
    service: ChatServiceDep,
    after: Annotated[int, Query(ge=0)] = 0,
) -> list[MessageOut]:
    return [MessageOut.of(m, me.id, PREFIX) for m in await service.messages(me, room_id, after)]


@router.post("/{room_id}/messages", response_model=MessageOut, status_code=201)
async def send_text(
    room_id: uuid.UUID, body: TextMessageCreate, me: CurrentUser, service: ChatServiceDep
) -> MessageOut:
    return MessageOut.of(await service.send_text(me, room_id, body.text), me.id, PREFIX)


@router.post("/{room_id}/voice", response_model=MessageOut, status_code=201)
async def send_voice(
    room_id: uuid.UUID,
    me: CurrentUser,
    service: ChatServiceDep,
    audio: Annotated[UploadFile, File()],
    duration_sec: Annotated[int, Form(ge=0)] = 0,
) -> MessageOut:
    data = await audio.read()
    msg = await service.send_voice(me, room_id, data, audio.content_type or "", duration_sec)
    return MessageOut.of(msg, me.id, PREFIX)


@router.get("/voice/{message_id}")
async def voice_file(message_id: int, me: CurrentUser, service: ChatServiceDep) -> FileResponse:
    return FileResponse(await service.voice_file(me, message_id))
