"""chat 도메인 의존성 — mission 도메인도 이걸로 ChatService 를 받는다."""

from typing import Annotated

from fastapi import Depends

from app.core.deps import DbSession, MediaStorage
from app.domains.auth.deps import AuthServiceDep
from app.domains.chat.repository import ChatRepository
from app.domains.chat.service import ChatService
from app.domains.friend.deps import FriendServiceDep
from app.domains.risk.deps import RiskServiceDep


def get_chat_service(
    session: DbSession,
    auth: AuthServiceDep,
    friends: FriendServiceDep,
    risk: RiskServiceDep,
    storage: MediaStorage,
) -> ChatService:
    return ChatService(ChatRepository(session), auth, friends, risk, storage)


ChatServiceDep = Annotated[ChatService, Depends(get_chat_service)]
