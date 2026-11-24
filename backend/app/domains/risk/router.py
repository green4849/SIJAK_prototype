import uuid

from fastapi import APIRouter

from app.core.errors import NotFoundError
from app.core.ratelimit import Rule, enforce
from app.domains.auth.deps import AuthServiceDep, CurrentUser
from app.domains.chat.deps import ChatServiceDep
from app.domains.risk.deps import RiskServiceDep
from app.domains.risk.models import REPORT_REASONS
from app.domains.risk.schemas import (
    BlockCreate,
    BlockedUser,
    ReasonOption,
    ReportCreate,
    ReportResult,
)
from app.domains.risk.service import InvalidReportError

router = APIRouter(prefix="/safety", tags=["safety"])

# 요청 횟수 제한 (B2) — 신고 남용 막기 (차단은 제한 없음: 위험할 때 바로 할 수 있어야)
REPORT_PER_USER = Rule("report:user", limit=10, window_sec=3600, action="신고")


@router.get("/report-reasons", response_model=list[ReasonOption])
async def report_reasons() -> list[ReasonOption]:
    return [ReasonOption(code=k, label=v) for k, v in REPORT_REASONS.items()]


async def _must_exist(auth: AuthServiceDep, user_id: uuid.UUID) -> None:
    """없는 사람을 신고·차단하면 DB 외래 키 오류(500) 대신 404 (H42)"""
    if user_id not in await auth.get_users({user_id}):
        raise NotFoundError("그분을 찾을 수 없어요.")


@router.post("/reports", status_code=201, response_model=ReportResult)
async def report(
    body: ReportCreate,
    me: CurrentUser,
    risk: RiskServiceDep,
    auth: AuthServiceDep,
    chat: ChatServiceDep,
) -> ReportResult:
    await enforce(REPORT_PER_USER, me.id)
    await _must_exist(auth, body.target_user_id)
    # 메시지를 붙였으면: 내가 있는 방의 메시지이고, 신고하는 상대가 보낸 것이어야 한다
    if body.message_id is not None:
        sender = await chat.sender_in_my_room(me, body.message_id)
        if sender != body.target_user_id:
            raise InvalidReportError("그분이 보낸 메시지가 아니에요.")
    await risk.report(me.id, body.target_user_id, body.reason, body.message_id)
    if body.also_block:
        await risk.block(me.id, body.target_user_id)
    return ReportResult(blocked=body.also_block)


@router.get("/blocks", response_model=list[BlockedUser])
async def blocked(me: CurrentUser, risk: RiskServiceDep, auth: AuthServiceDep) -> list[BlockedUser]:
    ids = await risk.blocked_by_me(me.id)
    users = await auth.get_users(set(ids))
    return [
        BlockedUser(user_id=i, name=users[i].name, gender=users[i].gender)
        for i in ids
        if i in users
    ]


@router.post("/blocks", status_code=204)
async def block(
    body: BlockCreate, me: CurrentUser, risk: RiskServiceDep, auth: AuthServiceDep
) -> None:
    await _must_exist(auth, body.user_id)
    await risk.block(me.id, body.user_id)


@router.delete("/blocks/{user_id}", status_code=204)
async def unblock(user_id: uuid.UUID, me: CurrentUser, risk: RiskServiceDep) -> None:
    await risk.unblock(me.id, user_id)
