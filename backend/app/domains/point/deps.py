"""point 도메인 의존성 — friend·activity·mission 도 이걸로 PointService 를 받는다."""

from typing import Annotated

from fastapi import Depends

from app.core.deps import DbSession
from app.domains.point.repository import PointRepository
from app.domains.point.service import PointService


def get_point_service(session: DbSession) -> PointService:
    return PointService(PointRepository(session))


PointServiceDep = Annotated[PointService, Depends(get_point_service)]
