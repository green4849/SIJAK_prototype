"""auth 비즈니스 로직. FastAPI를 모른다 — 도메인 예외만 던진다.

흐름 (보고서의 '신규/기존 회원' 분기를 본인인증 하나로 통합):
  1) start_verification : 본인인증 시작
  2) verify             : 인증 성공 →  기존 회원이면 로그인(토큰 발급)
                                       신규면 signup_token 발급
  3) signup             : signup_token + 지역·관심사 → 가입 + 로그인
  4) refresh / logout   : refresh 토큰 회전·폐기
"""

import uuid
from dataclasses import dataclass
from datetime import UTC, date, datetime, timedelta

from app.core.config import get_settings
from app.core.errors import ConflictError, DomainError, ForbiddenError, UnauthorizedError
from app.core.security import create_token, decode_token, encrypt, hash_phone, normalize_phone
from app.domains.auth.constants import INTERESTS, MAX_INTERESTS, REGIONS
from app.domains.auth.models import User
from app.domains.auth.repository import AuthRepository
from app.integrations.identity.base import (
    IdentityProvider,
    IdentityRequest,
    IdentitySession,
    IdentityVerificationFailed,
    VerifiedIdentity,
)


class VerificationFailedError(DomainError):
    code = "verification_failed"


class InvalidSignupInputError(DomainError):
    status_code = 422
    code = "invalid_signup_input"


@dataclass(frozen=True)
class TokenPair:
    access_token: str
    refresh_token: str
    refresh_expires_at: datetime


@dataclass(frozen=True)
class LoggedIn:
    user: User
    tokens: TokenPair


@dataclass(frozen=True)
class SignupRequired:
    signup_token: str
    name: str


def age_on(birth: date, today: date) -> int:
    return today.year - birth.year - ((today.month, today.day) < (birth.month, birth.day))


class AuthService:
    def __init__(self, repo: AuthRepository, identity: IdentityProvider) -> None:
        self.repo = repo
        self.identity = identity
        self.settings = get_settings()

    # ---------- 본인인증 ----------

    async def start_verification(self, req: IdentityRequest) -> IdentitySession:
        return await self.identity.start(req)

    async def verify(self, session_id: str, code: str) -> LoggedIn | SignupRequired:
        try:
            ident = await self.identity.verify(session_id, code)
        except IdentityVerificationFailed as e:
            raise VerificationFailedError(str(e)) from e

        user = await self.repo.get_user_by_ci(ident.ci)
        if user is not None:
            self._ensure_can_login(user)
            return LoggedIn(user, await self._login(user))

        self._ensure_age(ident.birth_date)
        if await self.repo.get_user_by_phone_hash(hash_phone(ident.phone)):
            raise ConflictError("이미 다른 분이 쓰고 있는 전화번호예요.", code="phone_in_use")
        return SignupRequired(self._issue_signup_token(ident), ident.name)

    # ---------- 가입 ----------

    async def signup(self, signup_token: str, region_code: str, interests: list[str]) -> LoggedIn:
        claims = decode_token(signup_token, "signup")
        self._validate_profile(region_code, interests)

        if await self.repo.get_user_by_ci(claims["ci"]):
            raise ConflictError(
                "이미 가입된 분이에요. 처음 화면에서 다시 인증해 주세요.", code="already_registered"
            )

        phone = normalize_phone(claims["phone"])
        user = await self.repo.add_user(
            User(
                name=claims["name"],
                birth_date=date.fromisoformat(claims["birth_date"]),
                gender=claims["gender"],
                phone_hash=hash_phone(phone),
                phone_enc=encrypt(phone),
                pass_ci=claims["ci"],
                region_code=region_code,
            ),
            interests=list(dict.fromkeys(interests)),  # 중복 제거, 순서 유지
        )
        return LoggedIn(user, await self._login(user))

    # ---------- 세션 ----------

    async def refresh(self, refresh_token: str) -> TokenPair:
        claims = decode_token(refresh_token, "refresh")
        stored = await self.repo.get_refresh_token(claims["jti"])
        user_id = uuid.UUID(claims["sub"])

        if stored is None:
            raise UnauthorizedError("다시 로그인해 주세요.", code="invalid_token")
        if stored.revoked_at is not None:
            # 이미 회전된 토큰이 다시 쓰임 → 탈취 의심, 해당 사용자 세션 전부 폐기
            await self.repo.revoke_all_refresh_tokens(user_id)
            await self.repo.commit()
            raise UnauthorizedError("다시 로그인해 주세요.", code="token_reused")

        user = await self.get_active_user(user_id)
        await self.repo.revoke_refresh_token(stored.jti)
        tokens = await self._issue_tokens(user)
        await self.repo.commit()
        return tokens

    async def logout(self, refresh_token: str | None) -> None:
        if not refresh_token:
            return
        try:
            claims = decode_token(refresh_token, "refresh")
        except UnauthorizedError:
            return  # 이미 무효한 토큰 — 로그아웃은 항상 성공 처리
        await self.repo.revoke_refresh_token(claims["jti"])
        await self.repo.commit()

    async def get_active_user(self, user_id: uuid.UUID) -> User:
        """다른 도메인·의존성이 쓰는 공개 메서드."""
        user = await self.repo.get_user(user_id)
        if user is None:
            raise UnauthorizedError("다시 로그인해 주세요.", code="user_not_found")
        self._ensure_can_login(user)
        return user

    # ---------- 내부 ----------

    async def _login(self, user: User) -> TokenPair:
        await self.repo.touch_last_login(user)
        tokens = await self._issue_tokens(user)
        await self.repo.commit()
        return tokens

    async def _issue_tokens(self, user: User) -> TokenPair:
        s = self.settings
        access, _, _ = create_token(
            "access", str(user.id), timedelta(minutes=s.access_token_minutes)
        )
        refresh, jti, exp = create_token(
            "refresh", str(user.id), timedelta(days=s.refresh_token_days)
        )
        await self.repo.add_refresh_token(jti, user.id, exp)
        return TokenPair(access, refresh, exp)

    def _issue_signup_token(self, ident: VerifiedIdentity) -> str:
        token, _, _ = create_token(
            "signup",
            subject=ident.ci,
            expires_in=timedelta(minutes=self.settings.signup_token_minutes),
            extra={
                "ci": ident.ci,
                "name": ident.name,
                "birth_date": ident.birth_date.isoformat(),
                "phone": ident.phone,
                "gender": ident.gender,
            },
        )
        return token

    def _ensure_age(self, birth: date) -> None:
        if age_on(birth, datetime.now(UTC).date()) < self.settings.min_signup_age:
            raise ForbiddenError(
                f"만 {self.settings.min_signup_age}세 이상부터 가입할 수 있어요.",
                code="age_restricted",
            )

    @staticmethod
    def _ensure_can_login(user: User) -> None:
        if user.status == "active":
            return
        messages = {
            "suspended": "이용이 잠시 정지된 계정이에요.",
            "banned": "이용이 제한된 계정이에요.",
            "deleted": "탈퇴한 계정이에요.",
        }
        raise ForbiddenError(
            messages.get(user.status, "이용할 수 없는 계정이에요."), code=f"user_{user.status}"
        )

    @staticmethod
    def _validate_profile(region_code: str, interests: list[str]) -> None:
        if region_code not in REGIONS:
            raise InvalidSignupInputError("사는 곳을 다시 골라 주세요.")
        if not interests:
            raise InvalidSignupInputError("좋아하는 것을 하나 이상 골라 주세요.")
        unknown = [i for i in interests if i not in INTERESTS]
        if unknown:
            raise InvalidSignupInputError("고를 수 없는 관심사가 있어요.")
        if len(set(interests)) > MAX_INTERESTS:
            raise InvalidSignupInputError(f"관심사는 {MAX_INTERESTS}개까지 고를 수 있어요.")
