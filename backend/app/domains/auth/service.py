"""auth 비즈니스 로직. FastAPI를 모른다 — 도메인 예외만 던진다.

흐름 (보고서의 '신규/기존 회원' 분기를 본인인증 하나로 통합):
  1) start_verification : 본인인증 시작
  2) verify             : 인증 성공 →  기존 회원이면 로그인(토큰 발급)
                                       신규면 signup_token 발급
  3) signup             : signup_token + 지역·관심사 → 가입 + 로그인
  4) refresh / logout   : refresh 토큰 회전·폐기
  5) withdraw           : 회원 탈퇴 (B3) — 바로 deleted, 30일 뒤 완전 삭제 예정일 기록
"""

import uuid
from dataclasses import dataclass
from datetime import UTC, date, datetime, timedelta, timezone

from app.core.config import get_settings
from app.core.errors import ConflictError, DomainError, ForbiddenError, UnauthorizedError
from app.core.security import create_token, decode_token, encrypt, hash_phone, normalize_phone
from app.domains.auth.constants import (
    CONSENT_DOCS,
    CONSENT_VERSIONS,
    INTERESTS,
    MAX_INTERESTS,
    REGIONS,
    WITHDRAW_GRACE_DAYS,
)
from app.domains.auth.models import ConsentRecord, User
from app.domains.auth.repository import AuthRepository
from app.integrations.identity.base import (
    IdentityProvider,
    IdentityRequest,
    IdentitySession,
    IdentityVerificationFailed,
    VerifiedIdentity,
)

_KST = timezone(timedelta(hours=9))


class VerificationFailedError(DomainError):
    code = "verification_failed"


class InvalidSignupInputError(DomainError):
    """가입·프로필 수정 입력 오류"""

    status_code = 422
    code = "invalid_profile_input"


def _record(kind: str, agreed: bool) -> ConsentRecord:
    # 시각은 앱에서 넣는다 — 저장 직후 응답에서 바로 읽을 수 있게 (DB 기본값은 다시 읽어 와야 함)
    return ConsentRecord(
        kind=kind, version=CONSENT_VERSIONS[kind], agreed=agreed, created_at=datetime.now(UTC)
    )


class ConsentError(DomainError):
    """동의 항목 오류 — 필수 동의가 빠졌거나, 버전이 지금 문서와 다르거나,
    필수 동의를 철회하려 함"""

    status_code = 422
    code = "consent_invalid"


@dataclass(frozen=True)
class ConsentChoice:
    kind: str
    version: str
    agreed: bool


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
            await self._lift_expired_suspension(user)
            self._ensure_can_login(user)
            return LoggedIn(user, await self._login(user))

        self._ensure_age(ident.birth_date)
        if await self.repo.get_user_by_phone_hash(hash_phone(ident.phone)):
            raise ConflictError("이미 다른 분이 쓰고 있는 전화번호예요.", code="phone_in_use")
        return SignupRequired(self._issue_signup_token(ident), ident.name)

    # ---------- 가입 ----------

    async def signup(
        self,
        signup_token: str,
        region_code: str,
        interests: list[str],
        consents: list[ConsentChoice],
    ) -> LoggedIn:
        claims = decode_token(signup_token, "signup")
        self._validate_profile(region_code, interests)
        records = self._signup_consents(consents)

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
                consents=records,
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
            grace = timedelta(seconds=get_settings().refresh_reuse_grace_seconds)
            if datetime.now(UTC) - stored.revoked_at < grace:
                # 방금 다른 요청(다른 탭)이 회전시킨 토큰 → 새 쿠키로 다시 시도하면 된다
                raise UnauthorizedError("잠시 후 다시 시도해 주세요.", code="token_rotated")
            # 이미 회전된 토큰이 한참 뒤 다시 쓰임 → 탈취 의심, 해당 사용자 세션 전부 폐기
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

    # ---------- 동의 (B6·B5) ----------

    @staticmethod
    def consent_state(user: User) -> dict[str, ConsentRecord | None]:
        """종류별 가장 최근 기록 (없으면 None)"""
        latest: dict[str, ConsentRecord | None] = dict.fromkeys(CONSENT_DOCS)
        for r in user.consents:  # id 순 → 뒤에 온 것이 최신
            if r.kind in latest:
                latest[r.kind] = r
        return latest

    @classmethod
    def has_consent(cls, user: User, kind: str) -> bool:
        """지금 문서 버전에 동의한 상태인지 — 문서가 바뀌면(버전 ↑) 다시 동의해야 한다"""
        r = cls.consent_state(user).get(kind)
        return r is not None and r.agreed and r.version == CONSENT_VERSIONS[kind]

    @classmethod
    def consent_needed(cls, user: User) -> list[str]:
        """아직 동의하지 않은(또는 문서가 바뀐) 필수 문서 — 있으면 앱을 쓰기 전에 다시 받는다"""
        return [
            k for k, required in CONSENT_DOCS.items() if required and not cls.has_consent(user, k)
        ]

    async def set_consents(self, user: User, choices: list[ConsentChoice]) -> User:
        """마이페이지·다시 동의 화면에서 — 동의하거나 선택 동의를 철회한다.

        필수 동의 철회는 받지 않는다(서비스를 쓸 수 없으므로) → 탈퇴로 안내.
        """
        records = []
        for c in self._checked(choices):
            if not c.agreed and CONSENT_DOCS[c.kind]:
                raise ConsentError(
                    "꼭 필요한 동의라 철회할 수 없어요. "
                    "그만 쓰시려면 마이페이지에서 탈퇴해 주세요.",
                    code="consent_required",
                )
            records.append(_record(c.kind, c.agreed))
        user.consents.extend(records)
        await self.repo.commit()
        return user

    async def set_health_consent(self, user: User, agreed: bool) -> User:
        """마음 건강 기록(선택) 동의·철회 — 기록 삭제는 wellbeing 이 먼저 한다"""
        return await self.set_consents(
            user, [ConsentChoice("health", CONSENT_VERSIONS["health"], agreed)]
        )

    @classmethod
    def _signup_consents(cls, choices: list[ConsentChoice]) -> list[ConsentRecord]:
        """가입 동의 — 필수는 모두 동의해야 한다. 빠진 선택 문서는 '동의 안 함'으로 남긴다"""
        given = {c.kind: c for c in cls._checked(choices)}
        missing = [
            k
            for k, required in CONSENT_DOCS.items()
            if required and not (k in given and given[k].agreed)
        ]
        if missing:
            raise ConsentError("꼭 필요한 항목에 모두 동의해 주세요.", code="consent_required")
        return [_record(k, k in given and given[k].agreed) for k in CONSENT_DOCS]

    @staticmethod
    def _checked(choices: list[ConsentChoice]) -> list[ConsentChoice]:
        """모르는 종류·지난 버전은 받지 않는다 — 사용자가 본 문서와 저장하는 버전이 같아야 한다"""
        seen: set[str] = set()
        for c in choices:
            if c.kind not in CONSENT_DOCS or c.kind in seen:
                raise ConsentError("동의 항목을 다시 확인해 주세요.")
            if c.version != CONSENT_VERSIONS[c.kind]:
                raise ConsentError(
                    "약관이 바뀌었어요. 화면을 새로 고친 뒤 다시 동의해 주세요.",
                    code="consent_outdated",
                )
            seen.add(c.kind)
        return choices

    # ---------- 회원 탈퇴 (B3) ----------

    async def withdraw(self, user: User, reason: str | None) -> date:
        """바로 status=deleted(로그인·추천·친구 목록에서 빠짐), 모든 기기 로그아웃.

        반환: 개인정보를 완전히 지우는 날(한국 날짜). 실제 삭제·음성 90일 정리는
        예약 작업이 할 일 — 지금은 날짜만 기록한다 (docs/deferred.md §7).
        """
        delete_after = datetime.now(_KST).date() + timedelta(days=WITHDRAW_GRACE_DAYS)
        await self.repo.withdraw(user, datetime.now(UTC), delete_after, reason)
        await self.repo.commit()
        return delete_after

    async def withdrawn_due(self, today: date | None = None) -> list[User]:
        """완전 삭제일(delete_after, 한국 날짜)이 된 탈퇴 계정 — 예약 작업용"""
        return await self.repo.withdrawn_due(today or datetime.now(_KST).date())

    async def purge_withdrawn(self, user: User) -> None:
        """탈퇴 이유만 달별로 세고 사용자 행을 지운다 (친구·대화·포인트 등은 DB가 함께 지움)"""
        if user.status != "deleted":
            return
        at = (user.withdrawn_at or datetime.now(UTC)).astimezone(_KST).date()
        await self.repo.count_withdraw_reason(at.replace(day=1), user.withdraw_reason or "")
        await self.repo.delete_user(user.id)
        await self.repo.commit()

    # ---------- 프로필 (⑨ 마이페이지) ----------

    async def update_profile(
        self,
        user: User,
        *,
        intro: str | None = None,
        region_code: str | None = None,
        interests: list[str] | None = None,
    ) -> User:
        """None인 항목은 그대로 둔다 (부분 수정)."""
        if region_code is not None:
            self._validate_region(region_code)
            user.region_code = region_code
        if interests is not None:
            self._validate_interests(interests)
            await self.repo.set_interests(user, interests)
        if intro is not None:
            user.intro = " ".join(intro.split())  # 줄바꿈·연속 공백 정리
        await self.repo.commit()
        return user

    async def set_location(self, user: User, lat: float, lng: float) -> User:
        """GPS → 소수점 2자리(≈1.1km)로 뭉개서 저장. 원본 좌표는 남기지 않는다."""
        user.geo_lat = round(lat, 2)
        user.geo_lng = round(lng, 2)
        user.geo_updated_at = datetime.now(UTC)
        await self.repo.commit()
        return user

    # ---------- 다른 도메인용 공개 메서드 ----------

    async def list_active_users(
        self, *, region_code: str | None = None, exclude_ids: set[uuid.UUID] | None = None
    ) -> list[User]:
        return await self.repo.list_active_users(
            region_code=region_code, exclude_ids=exclude_ids or set()
        )

    async def get_users(self, ids: set[uuid.UUID]) -> dict[uuid.UUID, User]:
        return {u.id: u for u in await self.repo.get_users(ids)}

    async def get_active_user(self, user_id: uuid.UUID) -> User:
        """다른 도메인·의존성이 쓰는 공개 메서드."""
        user = await self.repo.get_user(user_id)
        if user is None:
            raise UnauthorizedError("다시 로그인해 주세요.", code="user_not_found")
        await self._lift_expired_suspension(user)
        self._ensure_can_login(user)
        return user

    async def sanction(
        self, user_id: uuid.UUID, status: str, suspended_until: datetime | None
    ) -> None:
        """운영자 처리(B7) — 정지(suspended, 기한 있음)·영구 제한(banned). 모든 기기 로그아웃.

        커밋은 부른 쪽(admin)의 처리 기록과 함께.
        """
        user = await self.repo.get_user(user_id)
        if user is None or user.status == "deleted":
            return
        if user.status == "banned" and status == "suspended":
            return  # 더 무거운 처리가 이미 있으면 그대로
        await self.repo.set_status(user, status, suspended_until)
        await self.repo.revoke_all_refresh_tokens(user.id)

    @staticmethod
    def is_operator(user: User) -> bool:
        return user.role == "operator"

    # ---------- 내부 ----------

    async def _lift_expired_suspension(self, user: User) -> None:
        """기한이 지난 정지는 다음 접속 때 풀어 준다 (따로 예약 작업 없이)"""
        if (
            user.status == "suspended"
            and user.suspended_until is not None
            and user.suspended_until <= datetime.now(UTC)
        ):
            await self.repo.set_status(user, "active", None)
            await self.repo.commit()

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
        message = messages.get(user.status, "이용할 수 없는 계정이에요.")
        if user.status == "suspended" and user.suspended_until:
            d = user.suspended_until.astimezone(_KST)
            message += f" {d.month}월 {d.day}일 {d.hour}시부터 다시 쓸 수 있어요."
        if user.status == "deleted" and user.delete_after:
            d = user.delete_after
            message += f" {d.month}월 {d.day}일 뒤에 다시 가입할 수 있어요."
        raise ForbiddenError(message, code=f"user_{user.status}")

    @classmethod
    def _validate_profile(cls, region_code: str, interests: list[str]) -> None:
        cls._validate_region(region_code)
        cls._validate_interests(interests)

    @staticmethod
    def _validate_region(region_code: str) -> None:
        if region_code not in REGIONS:
            raise InvalidSignupInputError("사는 곳을 다시 골라 주세요.")

    @staticmethod
    def _validate_interests(interests: list[str]) -> None:
        if not interests:
            raise InvalidSignupInputError("좋아하는 것을 하나 이상 골라 주세요.")
        unknown = [i for i in interests if i not in INTERESTS]
        if unknown:
            raise InvalidSignupInputError("고를 수 없는 것이 섞여 있어요. 다시 골라 주세요.")
        if len(set(interests)) > MAX_INTERESTS:
            raise InvalidSignupInputError(f"좋아하는 것은 {MAX_INTERESTS}개까지 고를 수 있어요.")
