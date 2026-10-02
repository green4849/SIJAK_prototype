"""auth 도메인의 FastAPI 의존성.

`CurrentUser` 는 auth 도메인의 **공개 API** 다. 다른 도메인 router는
`from app.domains.auth.deps import CurrentUser` 로만 사용자 정보를 얻는다.
(docs/dev-order.md §2-5 의 허용된 예외)
"""

import uuid
from typing import Annotated

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.deps import DbSession
from app.core.errors import UnauthorizedError
from app.core.security import decode_token
from app.domains.auth.models import User
from app.domains.auth.repository import AuthRepository
from app.domains.auth.service import AuthService
from app.integrations.identity import get_identity_provider

_bearer = HTTPBearer(auto_error=False)


def get_auth_service(session: DbSession) -> AuthService:
    return AuthService(AuthRepository(session), get_identity_provider())


AuthServiceDep = Annotated[AuthService, Depends(get_auth_service)]


async def get_current_user(
    service: AuthServiceDep,
    cred: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)],
) -> User:
    if cred is None:
        raise UnauthorizedError("로그인이 필요해요.", code="not_authenticated")
    claims = decode_token(cred.credentials, "access")
    return await service.get_active_user(uuid.UUID(claims["sub"]))


CurrentUser = Annotated[User, Depends(get_current_user)]
