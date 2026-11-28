import uuid
from typing import Annotated

from fastapi import APIRouter, Query

from app.core.ratelimit import Rule, enforce
from app.domains.auth.deps import CurrentUser
from app.domains.friend.deps import FriendServiceDep
from app.domains.friend.schemas import (
    FriendCard,
    FriendRequestCreate,
    RatingCreate,
    RatingOut,
    SurveyAnswers,
    SurveyOut,
)
from app.domains.friend.service import Tab

router = APIRouter(prefix="/friends", tags=["friend"])

# 요청 횟수 제한 (B2) — 모르는 사람에게 무더기 신청 막기
FRIEND_REQUEST_PER_USER = Rule("friend_request:user", limit=30, window_sec=3600, action="친구 신청")


@router.get("/recommendations", response_model=list[FriendCard])
async def recommendations(
    me: CurrentUser,
    service: FriendServiceDep,
    tab: Annotated[Tab, Query()] = "recommended",
    q: Annotated[str, Query(max_length=50)] = "",
) -> list[FriendCard]:
    return [FriendCard.of(c) for c in await service.recommend(me, tab, q)]


@router.get("/survey", response_model=SurveyOut)
async def survey(me: CurrentUser, service: FriendServiceDep) -> SurveyOut:
    """성향조사 문항과 내 답 (안 했으면 answers=null)"""
    return SurveyOut.of([i.category for i in me.interests], await service.survey(me))


@router.put("/survey", response_model=SurveyOut)
async def save_survey(body: SurveyAnswers, me: CurrentUser, service: FriendServiceDep) -> SurveyOut:
    """성향조사 저장 — Q1은 내 '좋아하는 것'도 함께 바꾼다"""
    saved = await service.save_survey(me, body.interests, body.to_answers())
    return SurveyOut.of([i.category for i in me.interests], saved)


@router.put("/recommendations/{user_id}/rating", response_model=RatingOut)
async def rate(
    user_id: uuid.UUID, body: RatingCreate, me: CurrentUser, service: FriendServiceDep
) -> RatingOut:
    return RatingOut.of(await service.rate(me, user_id, body.rating))


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
