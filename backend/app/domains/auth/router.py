"""auth HTTP 계층: 요청 파싱 → service 호출 → 응답/쿠키. 로직 없음.

refresh 토큰은 httpOnly 쿠키(경로 /api/v1/auth)로만 주고받는다.
access 토큰은 응답 본문으로 주고, 프론트는 메모리에만 보관한다.
"""

import secrets
from typing import Annotated

from fastapi import APIRouter, Cookie, Request, Response, status
from fastapi.responses import RedirectResponse

from app.core.config import get_settings
from app.core.errors import ForbiddenError, UnauthorizedError
from app.core.ratelimit import Rule, enforce
from app.domains.auth.constants import INTERESTS, MAX_INTERESTS, REGIONS
from app.domains.auth.deps import AuthServiceDep, CurrentUser
from app.domains.auth.schemas import (
    AuthMethod,
    AuthResult,
    ConsentStatusOut,
    ConsentsUpdate,
    FirebaseWebConfig,
    KakaoCompleteRequest,
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
    SmsChallenge,
    TokenResponse,
    UserOut,
    WithdrawIn,
    WithdrawOut,
    consent_docs,
    consent_status,
)
from app.domains.auth.service import ConsentError, LoggedIn, TokenPair
from app.integrations.identity.base import IdentityRequest
from app.integrations.kakao_login import authorization_url, exchange_user

router = APIRouter(tags=["auth"])
settings = get_settings()
RefreshCookie = Annotated[str | None, Cookie(alias=settings.refresh_cookie_name)]

# 요청 횟수 제한 (B2)
PASS_START_PER_PHONE = Rule("pass_start:phone", limit=5, window_sec=600, action="인증번호 요청")
PASS_START_PER_IP = Rule("pass_start:ip", limit=20, window_sec=600, action="인증번호 요청")
PASS_VERIFY_PER_IP = Rule("pass_verify:ip", limit=30, window_sec=600, action="인증번호 확인")
KAKAO_COMPLETE_PER_IP = Rule("kakao_complete:ip", limit=30, window_sec=600, action="카카오 로그인")
KAKAO_STATE_COOKIE = "wipi_kakao_state"


@router.get("/auth/method", response_model=AuthMethod)
async def auth_method() -> AuthMethod:
    return AuthMethod(mode=settings.auth_mode)


def _require_mode(mode: str) -> None:
    if settings.auth_mode != mode:
        raise ForbiddenError("이 로그인 방법은 사용할 수 없어요.", code="auth_method_unavailable")


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
        consents=consent_docs(),
        sms_provider="firebase" if settings.identity_provider == "firebase" else None,
    )


@router.post("/auth/pass/start", response_model=PassStartResponse)
async def pass_start(
    body: PassStartRequest, request: Request, service: AuthServiceDep
) -> PassStartResponse:
    _require_mode("phone")
    await enforce(PASS_START_PER_IP, _client_ip(request))
    await enforce(PASS_START_PER_PHONE, body.phone)
    session = await service.start_verification(
        IdentityRequest(
            name=body.name, birth_date=body.birth_date, phone=body.phone, gender=body.gender
        )
    )
    return PassStartResponse(
        session_id=session.session_id,
        dev_code=session.dev_code,
        sms=_firebase_challenge(session.client_sms_to) if session.client_sms_to else None,
    )


def _firebase_challenge(phone_e164: str) -> SmsChallenge:
    return SmsChallenge(
        provider="firebase",
        phone_e164=phone_e164,
        firebase=FirebaseWebConfig(
            api_key=settings.firebase_web_api_key,
            auth_domain=settings.firebase_auth_domain
            or f"{settings.firebase_project_id}.firebaseapp.com",
            project_id=settings.firebase_project_id,
            app_id=settings.firebase_app_id,
        ),
    )


@router.post("/auth/pass/verify", response_model=AuthResult)
async def pass_verify(
    body: PassVerifyRequest, request: Request, service: AuthServiceDep, response: Response
) -> AuthResult:
    _require_mode("phone")
    await enforce(PASS_VERIFY_PER_IP, _client_ip(request))
    result = await service.verify(body.session_id, body.proof)
    if isinstance(result, LoggedIn):
        return _logged_in(response, result)
    return SignupRequiredResult(signup_token=result.signup_token, name=result.name)


@router.get("/auth/kakao/start", status_code=302, response_class=RedirectResponse)
async def kakao_start() -> RedirectResponse:
    _require_mode("kakao")
    if not all(
        (settings.kakao_rest_api_key, settings.kakao_client_secret, settings.kakao_redirect_uri)
    ):
        raise ForbiddenError("카카오 로그인 설정을 확인해 주세요.", code="kakao_not_configured")
    state = secrets.token_urlsafe(32)
    response = RedirectResponse(authorization_url(state), status_code=302)
    response.set_cookie(
        KAKAO_STATE_COOKIE,
        state,
        max_age=600,
        httponly=True,
        secure=settings.cookie_secure,
        samesite="lax",
        path=f"{settings.api_prefix}/auth/kakao",
    )
    response.headers["Cache-Control"] = "no-store"
    return response


@router.post("/auth/kakao/complete", response_model=AuthResult)
async def kakao_complete(
    body: KakaoCompleteRequest,
    request: Request,
    service: AuthServiceDep,
    response: Response,
    cookie_state: Annotated[str | None, Cookie(alias=KAKAO_STATE_COOKIE)] = None,
) -> AuthResult:
    _require_mode("kakao")
    await enforce(KAKAO_COMPLETE_PER_IP, _client_ip(request))
    if not cookie_state or not secrets.compare_digest(cookie_state, body.state):
        raise UnauthorizedError("카카오 로그인을 다시 시작해 주세요.", code="kakao_state_invalid")
    response.delete_cookie(KAKAO_STATE_COOKIE, path=f"{settings.api_prefix}/auth/kakao")
    kakao_id, nickname = await exchange_user(body.code)
    result = await service.login_with_kakao(kakao_id, nickname)
    if isinstance(result, LoggedIn):
        return _logged_in(response, result)
    return SignupRequiredResult(signup_token=result.signup_token, name=result.name)


@router.post("/auth/signup", response_model=LoggedInResult, status_code=status.HTTP_201_CREATED)
async def signup(
    body: SignupRequest, service: AuthServiceDep, response: Response
) -> LoggedInResult:
    result = await service.signup(
        body.signup_token,
        body.region_code,
        body.interests,
        [c.to_choice() for c in body.consents],
        name=body.name,
        birth_date=body.birth_date,
        gender=body.gender,
    )
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


@router.get("/me/consents", response_model=list[ConsentStatusOut])
async def my_consents(user: CurrentUser) -> list[ConsentStatusOut]:
    """약관·개인정보 동의 상태 (B6) — 마이페이지 '약관 및 동의'"""
    return consent_status(user)


@router.post("/me/consents", response_model=UserOut)
async def agree_consents(
    body: ConsentsUpdate, user: CurrentUser, service: AuthServiceDep
) -> UserOut:
    """동의하기 — 약관이 바뀌어 다시 받을 때, 마음 건강 기록에 나중에 동의할 때.

    철회는 여기서 받지 않는다: 필수는 탈퇴로, 마음 건강은 PUT /me/self-assessment/consent
    (기록을 함께 지워야 하므로 wellbeing 이 맡는다).
    """
    if not all(c.agreed for c in body.items):
        raise ConsentError("동의 철회는 해당 화면에서 해 주세요.")
    return UserOut.from_user(await service.set_consents(user, [c.to_choice() for c in body.items]))


@router.post("/me/withdraw", response_model=WithdrawOut)
async def withdraw(
    body: WithdrawIn, user: CurrentUser, service: AuthServiceDep, response: Response
) -> WithdrawOut:
    """회원 탈퇴 (B3) — 바로 로그아웃되고, delete_at 에 개인정보를 완전히 지운다"""
    delete_at = await service.withdraw(user, body.reason)
    response.delete_cookie(settings.refresh_cookie_name, path=f"{settings.api_prefix}/auth")
    return WithdrawOut(delete_at=delete_at)
