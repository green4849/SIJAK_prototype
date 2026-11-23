"""운영자·복지기관 화면 (B7) — 모든 API 가 운영자 역할을 확인한다 (CurrentOperator)."""

from typing import Annotated

from fastapi import APIRouter, Depends

from app.core.deps import DbSession
from app.domains.admin.repository import AdminRepository
from app.domains.admin.schemas import AdminCaseOut, AdminWatchOut, CaseActionIn
from app.domains.admin.service import AdminService
from app.domains.auth.deps import AuthServiceDep, CurrentOperator
from app.domains.chat.deps import ChatServiceDep
from app.domains.emergency.deps import EmergencyServiceDep
from app.domains.risk.deps import RiskServiceDep
from app.domains.wellbeing.deps import WellbeingServiceDep

router = APIRouter(prefix="/admin", tags=["admin"])


def get_admin_service(
    session: DbSession,
    auth: AuthServiceDep,
    risk: RiskServiceDep,
    chat: ChatServiceDep,
    wellbeing: WellbeingServiceDep,
    emergency: EmergencyServiceDep,
) -> AdminService:
    return AdminService(AdminRepository(session), auth, risk, chat, wellbeing, emergency)


AdminServiceDep = Annotated[AdminService, Depends(get_admin_service)]


@router.get("/cases", response_model=list[AdminCaseOut])
async def cases(op: CurrentOperator, service: AdminServiceDep) -> list[AdminCaseOut]:
    """신고·위험 대화 — 처리 전이 위로, 위험도 높은 순"""
    return [AdminCaseOut.of(c) for c in await service.cases()]


@router.post("/cases/{case_id}/action", response_model=AdminCaseOut)
async def act(
    case_id: str, body: CaseActionIn, op: CurrentOperator, service: AdminServiceDep
) -> AdminCaseOut:
    """경고 / 7일 정지 / 영구 제한 / 문제없음 — 처리 기록을 남기고 정지·제한은 계정에 바로 반영"""
    return AdminCaseOut.of(await service.act(op.id, case_id, body.action))


@router.get("/watch", response_model=list[AdminWatchOut])
async def watch(op: CurrentOperator, service: AdminServiceDep) -> list[AdminWatchOut]:
    """돌봄이 필요한 이웃 — 사회적 관계 지수 낮은 순"""
    return [AdminWatchOut.of(w) for w in await service.watch()]
