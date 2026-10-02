"""auth HTTP 계층: 요청 파싱 → service 호출 → 응답/쿠키. 로직 없음.

refresh 토큰은 httpOnly 쿠키(경로 /api/v1/auth)로만 주고받는다.
access 토큰은 응답 본문으로 주고, 프론트는 메모리에만 보관한다.
"""

from typing import Annotated

from fastapi import APIRouter, Cookie, Request, Response, status

from app.core.config import get_settings
from app.core.errors import UnauthorizedError
from app.core.ratelimit import Rule, enforce
from app.domains.auth.constants import INTERESTS, MAX_INTERESTS, REGIONS
from app.domains.auth.deps import AuthServiceDep, CurrentUser
from app.domains.auth.schemas import (
    AuthResult,
    LocationUpdate,
    LoggedInResult,
    Option,
    PassStartRequest,
    PassStartResponse,
    PassVerifyRequest,
    ProfileUpdate,
    RefreshRequest,
    SignupOptions,
    SignupRequest,
    SignupRequiredResult,
    TokenResponse,
    UserOut,
)
from app.domains.auth.service import LoggedIn, TokenPair
from app.integrations.identity.base import IdentityRequest

router = APIRouter(tags=["auth"])
settings = get_settings()
RefreshCookie = Annotated[str | None, Cookie(alias=settings.refresh_cookie_name)]

# 요청 횟수 제한 (B2) — 문자 발송 비용·무차별 대입 막기
PASS_START_PER_PHONE = Rule("pass_start:phone", limit=5, window_sec=600, action="인증번호 요청")
PASS_START_PER_IP = Rule("pass_start:ip", limit=20, window_sec=600, action="인증번호 요청")
PASS_VERIFY_PER_IP = Rule("pass_verify:ip", limit=30, window_sec=600, action="인증번호 확인")


def _client_ip(request: Request) -> str:
    # 프록시 뒤에서는 uvicorn --proxy-headers --forwarded-allow-ips 로 실제 IP가 들어온다 (B10)
    return request.client.host if request.client else "unknown"


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


def _logged_in(response: Response, result: LoggedIn) -> LoggedInResult:
    _set_refresh_cookie(response, result.tokens)
    return LoggedInResult(
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
async def pass_start(
    body: PassStartRequest, request: Request, service: AuthServiceDep
) -> PassStartResponse:
    await enforce(PASS_START_PER_IP, _client_ip(request))
    await enforce(PASS_START_PER_PHONE, body.phone)
    session = await service.start_verification(
        IdentityRequest(
            name=body.name, birth_date=body.birth_date, phone=body.phone, gender=body.gender
        )
    )
    return PassStartResponse(session_id=session.session_id, dev_code=session.dev_code)


@router.post("/auth/pass/verify", response_model=AuthResult)
async def pass_verify(
    body: PassVerifyRequest, request: Request, service: AuthServiceDep, response: Response
) -> AuthResult:
    await enforce(PASS_VERIFY_PER_IP, _client_ip(request))
    result = await service.verify(body.session_id, body.code)
    if isinstance(result, LoggedIn):
        return _logged_in(response, result)
    return SignupRequiredResult(signup_token=result.signup_token, name=result.name)


@router.post("/auth/signup", response_model=LoggedInResult, status_code=status.HTTP_201_CREATED)
async def signup(
    body: SignupRequest, service: AuthServiceDep, response: Response
) -> LoggedInResult:
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


@router.patch("/me", response_model=UserOut)
async def update_me(body: ProfileUpdate, user: CurrentUser, service: AuthServiceDep) -> UserOut:
    updated = await service.update_profile(
        user, intro=body.intro, region_code=body.region_code, interests=body.interests
    )
    return UserOut.from_user(updated)


@router.put("/me/location", response_model=UserOut)
async def update_location(
    body: LocationUpdate, user: CurrentUser, service: AuthServiceDep
) -> UserOut:
    return UserOut.from_user(await service.set_location(user, body.lat, body.lng))
