from typing import Annotated

from fastapi import Depends

from app.core.deps import DbSession
from app.domains.risk.repository import RiskRepository
from app.domains.risk.service import RiskService


def get_risk_service(session: DbSession) -> RiskService:
    return RiskService(RiskRepository(session))


RiskServiceDep = Annotated[RiskService, Depends(get_risk_service)]
