"""auth HTTP 계층: 요청 파싱 → service 호출 → 응답/쿠키. 로직 없음.

refresh 토큰은 httpOnly 쿠키(경로 /api/v1/auth)로만 주고받는다.
access 토큰은 응답 본문으로 주고, 프론트는 메모리에만 보관한다.
"""

from typing import Annotated

from fastapi import APIRouter, Cookie, Response, status

from app.core.config import get_settings
from app.core.errors import UnauthorizedError
from app.domains.auth.constants import INTERESTS, MAX_INTERESTS, REGIONS
from app.domains.auth.deps import AuthServiceDep, CurrentUser
from app.domains.auth.schemas import (
    AuthResult,
    Option,
    PassStartRequest,
    PassStartResponse,
    PassVerifyRequest,
    RefreshRequest,
    SignupOptions,
    SignupRequest,
    TokenResponse,
    UserOut,
)
from app.domains.auth.service import LoggedIn, TokenPair
from app.integrations.identity.base import IdentityRequest

router = APIRouter(tags=["auth"])
settings = get_settings()
RefreshCookie = Annotated[str | None, Cookie(alias=settings.refresh_cookie_name)]


def _set_refresh_cookie(response: Response, tokens: TokenPair) -> None:
    response.set_cookie(
        key=settings.refresh_cookie_name,
        value=tokens.refresh_token,
        expires=tokens.refresh_expires_at,
        httponly=True,
        secure=settings.cookie_secure,
        samesite="lax",
        path=f"{settings.api_prefix}/auth",
    )


def _logged_in(response: Response, result: LoggedIn) -> AuthResult:
    _set_refresh_cookie(response, result.tokens)
    return AuthResult(
        status="logged_in",
        access_token=result.tokens.access_token,
        user=UserOut.from_user(result.user),
    )


@router.get("/auth/options", response_model=SignupOptions)
async def signup_options() -> SignupOptions:
    return SignupOptions(
        regions=[Option(code=k, label=v) for k, v in REGIONS.items()],
        interests=[Option(code=k, label=v) for k, v in INTERESTS.items()],
        max_interests=MAX_INTERESTS,
    )


@router.post("/auth/pass/start", response_model=PassStartResponse)
async def pass_start(body: PassStartRequest, service: AuthServiceDep) -> PassStartResponse:
    session = await service.start_verification(
        IdentityRequest(
            name=body.name, birth_date=body.birth_date, phone=body.phone, gender=body.gender
        )
    )
    return PassStartResponse(session_id=session.session_id, dev_code=session.dev_code)


@router.post("/auth/pass/verify", response_model=AuthResult)
async def pass_verify(
    body: PassVerifyRequest, service: AuthServiceDep, response: Response
) -> AuthResult:
    result = await service.verify(body.session_id, body.code)
    if isinstance(result, LoggedIn):
        return _logged_in(response, result)
    return AuthResult(status="signup_required", signup_token=result.signup_token, name=result.name)


@router.post("/auth/signup", response_model=AuthResult, status_code=status.HTTP_201_CREATED)
async def signup(body: SignupRequest, service: AuthServiceDep, response: Response) -> AuthResult:
    result = await service.signup(body.signup_token, body.region_code, body.interests)
    return _logged_in(response, result)


@router.post("/auth/refresh", response_model=TokenResponse)
async def refresh(
    service: AuthServiceDep,
    response: Response,
    cookie_token: RefreshCookie = None,
    body: RefreshRequest | None = None,
) -> TokenResponse:
    token = cookie_token or (body.refresh_token if body else None)
    if not token:
        raise UnauthorizedError("로그인이 필요해요.", code="not_authenticated")
    tokens = await service.refresh(token)
    _set_refresh_cookie(response, tokens)
    return TokenResponse(access_token=tokens.access_token)


@router.post("/auth/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(
    service: AuthServiceDep, response: Response, cookie_token: RefreshCookie = None
) -> None:
    await service.logout(cookie_token)
    response.delete_cookie(settings.refresh_cookie_name, path=f"{settings.api_prefix}/auth")


@router.get("/me", response_model=UserOut)
async def me(user: CurrentUser) -> UserOut:
    return UserOut.from_user(user)
