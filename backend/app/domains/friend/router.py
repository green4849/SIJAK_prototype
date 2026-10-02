import uuid
from typing import Annotated

from fastapi import APIRouter, Query

from app.core.ratelimit import Rule, enforce
from app.domains.auth.deps import CurrentUser
from app.domains.friend.deps import FriendServiceDep
from app.domains.friend.schemas import FriendCard, FriendRequestCreate
from app.domains.friend.service import Tab

router = APIRouter(prefix="/friends", tags=["friend"])

# 요청 횟수 제한 (B2) — 모르는 사람에게 무더기 신청 막기
FRIEND_REQUEST_PER_USER = Rule("friend_request:user", limit=30, window_sec=3600, action="친구 신청")


@router.get("/recommendations", response_model=list[FriendCard])
async def recommendations(
    me: CurrentUser, service: FriendServiceDep, tab: Annotated[Tab, Query()] = "recommended"
) -> list[FriendCard]:
    return [FriendCard.of(c) for c in await service.recommend(me, tab)]


@router.get("", response_model=list[FriendCard])
async def my_friends(me: CurrentUser, service: FriendServiceDep) -> list[FriendCard]:
    return [FriendCard.of(c) for c in await service.list_friends(me)]


@router.get("/requests", response_model=list[FriendCard])
async def received_requests(me: CurrentUser, service: FriendServiceDep) -> list[FriendCard]:
    return [FriendCard.of(c) for c in await service.list_received(me)]


@router.post("/requests", response_model=FriendCard, status_code=201)
async def send_request(
    body: FriendRequestCreate, me: CurrentUser, service: FriendServiceDep
) -> FriendCard:
    await enforce(FRIEND_REQUEST_PER_USER, me.id)
    return FriendCard.of(await service.send_request(me, body.to_user_id))


@router.post("/requests/{request_id}/accept", status_code=204)
async def accept(request_id: uuid.UUID, me: CurrentUser, service: FriendServiceDep) -> None:
    await service.respond(me, request_id, accept=True)


@router.post("/requests/{request_id}/decline", status_code=204)
async def decline(request_id: uuid.UUID, me: CurrentUser, service: FriendServiceDep) -> None:
    await service.respond(me, request_id, accept=False)
