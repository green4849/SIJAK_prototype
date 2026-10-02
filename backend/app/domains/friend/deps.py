"""friend 도메인 의존성 — 다른 도메인(chat 등)도 이걸로 FriendService를 받는다."""

from typing import Annotated

from fastapi import Depends

from app.core.deps import DbSession
from app.domains.auth.deps import AuthServiceDep
from app.domains.friend.repository import FriendRepository
from app.domains.friend.service import FriendService
from app.domains.risk.deps import RiskServiceDep


def get_friend_service(
    session: DbSession, auth: AuthServiceDep, risk: RiskServiceDep
) -> FriendService:
    return FriendService(FriendRepository(session), auth, risk)


FriendServiceDep = Annotated[FriendService, Depends(get_friend_service)]
