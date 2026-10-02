import uuid

from fastapi import APIRouter

from app.core.ratelimit import Rule, enforce
from app.domains.auth.deps import AuthServiceDep, CurrentUser
from app.domains.risk.deps import RiskServiceDep
from app.domains.risk.models import REPORT_REASONS
from app.domains.risk.schemas import (
    BlockCreate,
    BlockedUser,
    ReasonOption,
    ReportCreate,
    ReportResult,
)

router = APIRouter(prefix="/safety", tags=["safety"])

# 요청 횟수 제한 (B2) — 신고 남용 막기 (차단은 제한 없음: 위험할 때 바로 할 수 있어야)
REPORT_PER_USER = Rule("report:user", limit=10, window_sec=3600, action="신고")


@router.get("/report-reasons", response_model=list[ReasonOption])
async def report_reasons() -> list[ReasonOption]:
    return [ReasonOption(code=k, label=v) for k, v in REPORT_REASONS.items()]


@router.post("/reports", status_code=201, response_model=ReportResult)
async def report(body: ReportCreate, me: CurrentUser, risk: RiskServiceDep) -> ReportResult:
    await enforce(REPORT_PER_USER, me.id)
    await risk.report(me.id, body.target_user_id, body.reason, body.message_id)
    if body.also_block:
        await risk.block(me.id, body.target_user_id)
    return ReportResult(blocked=body.also_block)


@router.get("/blocks", response_model=list[BlockedUser])
async def blocked(me: CurrentUser, risk: RiskServiceDep, auth: AuthServiceDep) -> list[BlockedUser]:
    ids = await risk.blocked_by_me(me.id)
    users = await auth.get_users(set(ids))
    return [BlockedUser(user_id=i, name=users[i].name) for i in ids if i in users]


@router.post("/blocks", status_code=204)
async def block(body: BlockCreate, me: CurrentUser, risk: RiskServiceDep) -> None:
    await risk.block(me.id, body.user_id)


@router.delete("/blocks/{user_id}", status_code=204)
async def unblock(user_id: uuid.UUID, me: CurrentUser, risk: RiskServiceDep) -> None:
    await risk.unblock(me.id, user_id)
