from fastapi import APIRouter, status

from app.core.errors import NotFoundError
from app.domains.auth.deps import CurrentUser
from app.domains.wellbeing.deps import WellbeingServiceDep
from app.domains.wellbeing.schemas import (
    AssessmentFormOut,
    AssessmentIn,
    AssessmentResultOut,
    RelationIndexOut,
    Who5StatusOut,
)
from app.domains.wellbeing.service import FORMS, WellbeingService

router = APIRouter(prefix="/me", tags=["wellbeing"])


@router.get("/relation-index", response_model=RelationIndexOut)
async def relation_index(me: CurrentUser, service: WellbeingServiceDep) -> RelationIndexOut:
    """사회적 관계 지수 — 볼 때마다 새로 계산하고 이번 주 값으로 남긴다"""
    return RelationIndexOut.of(await service.relation_index(me))


@router.get("/self-assessment", response_model=list[AssessmentResultOut])
async def assessment_history(
    me: CurrentUser, service: WellbeingServiceDep
) -> list[AssessmentResultOut]:
    """지난 자가평가 결과 (새것부터)"""
    return [AssessmentResultOut.of(r) for r in await service.history(me.id)]


@router.get("/who5", response_model=Who5StatusOut)
async def who5_status(me: CurrentUser, service: WellbeingServiceDep) -> Who5StatusOut:
    """WHO-5를 할 때인지 — 4주가 지났으면 알림함에도 한 번 알린다 (홈에서 부른다)"""
    return Who5StatusOut.of(await service.who5_status(me.id))


@router.get("/self-assessment/{kind}", response_model=AssessmentFormOut)
async def assessment_form(kind: str, me: CurrentUser) -> AssessmentFormOut:
    if kind not in FORMS:
        raise NotFoundError("없는 점검이에요.")
    return AssessmentFormOut.of(WellbeingService.form(kind))


@router.post(
    "/self-assessment", response_model=AssessmentResultOut, status_code=status.HTTP_201_CREATED
)
async def submit_assessment(
    body: AssessmentIn, me: CurrentUser, service: WellbeingServiceDep
) -> AssessmentResultOut:
    return AssessmentResultOut.of(await service.submit(me.id, body.kind, body.answers))
