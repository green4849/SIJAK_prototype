"""auth API 요청/응답 스키마 (HTTP 계약)."""

import uuid
from datetime import UTC, date, datetime
from typing import Annotated, Literal

from pydantic import BaseModel, Field, field_validator, model_validator

from app.core.security import normalize_phone
from app.domains.auth.constants import (
    CONSENT_DOCS,
    CONSENT_VERSIONS,
    INTRO_MAX_LEN,
    REGIONS,
    WITHDRAW_REASON_MAX_LEN,
)
from app.domains.auth.models import User
from app.domains.auth.service import AuthService, ConsentChoice, age_on


class PassStartRequest(BaseModel):
    name: str = Field(min_length=1, max_length=50)
    birth_date: date
    phone: str
    gender: Literal["M", "F"]

    @field_validator("name")
    @classmethod
    def _strip_name(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("이름을 입력해 주세요.")
        return v

    @field_validator("phone")
    @classmethod
    def _check_phone(cls, v: str) -> str:
        digits = normalize_phone(v)
        if not (digits.startswith("01") and len(digits) in (10, 11)):
            raise ValueError("휴대폰 번호를 다시 확인해 주세요.")
        return digits


class FirebaseWebConfig(BaseModel):
    """Firebase 웹 설정 — 비밀이 아니다 (브라우저 SDK 초기화용)"""

    api_key: str
    auth_domain: str
    project_id: str
    app_id: str


class SmsChallenge(BaseModel):
    """브라우저가 Firebase 로 인증 문자를 보내야 할 때 (IDENTITY_PROVIDER=firebase)"""

    provider: Literal["firebase"]
    phone_e164: str = Field(description="문자 받을 번호 (+8210…)")
    firebase: FirebaseWebConfig


class PassStartResponse(BaseModel):
    session_id: str
    dev_code: str | None = Field(description="Mock 인증 전용 — 실제 인증에서는 항상 null")
    sms: SmsChallenge | None = Field(
        default=None, description="있으면 브라우저가 Firebase 로 문자를 보낸다. Mock 이면 null"
    )


class PassVerifyRequest(BaseModel):
    """Mock 은 화면의 인증번호(code), Firebase 는 문자 확인 뒤 받은 ID 토큰(id_token).

    둘 중 하나만 보낸다.
    """

    session_id: str
    code: str | None = Field(default=None, min_length=6, max_length=6, pattern=r"^\d{6}$")
    id_token: str | None = Field(default=None, min_length=20, max_length=4096)

    @model_validator(mode="after")
    def _one_proof(self) -> "PassVerifyRequest":
        if (self.code is None) == (self.id_token is None):
            raise ValueError("인증번호를 다시 입력해 주세요.")
        return self

    @property
    def proof(self) -> str:
        return self.code or self.id_token or ""


ConsentKind = Literal["terms", "privacy", "location", "health"]


class ConsentChoiceIn(BaseModel):
    """동의 한 항목 — version 은 사용자가 본 문서의 버전 (GET /auth/options 의 consents)"""

    kind: ConsentKind
    version: str = Field(max_length=20)
    agreed: bool

    def to_choice(self) -> ConsentChoice:
        return ConsentChoice(self.kind, self.version, self.agreed)


class SignupRequest(BaseModel):
    signup_token: str
    region_code: str
    interests: list[str] = Field(default_factory=list, max_length=12)
    # 카카오 로그인 신규 회원의 직접 입력 정보. 본인확인 정보가 아니다.
    name: str | None = Field(default=None, max_length=50)
    birth_date: date | None = None
    gender: Literal["M", "F"] | None = None
    # 필수(terms·privacy·location)는 모두 agreed=true 여야 가입된다. 빠진 선택 항목은 '동의 안 함'
    consents: list[ConsentChoiceIn] = Field(default_factory=list, max_length=len(CONSENT_DOCS))


class KakaoCompleteRequest(BaseModel):
    code: str = Field(min_length=1, max_length=2048)
    state: str = Field(min_length=32, max_length=128)


class AuthMethod(BaseModel):
    mode: Literal["phone", "kakao"]


class ConsentsUpdate(BaseModel):
    items: list[ConsentChoiceIn] = Field(min_length=1, max_length=len(CONSENT_DOCS))


class ConsentStatusOut(BaseModel):
    kind: ConsentKind
    version: str
    required: bool
    agreed: bool
    # 지금 상태가 정해진 때 (동의·거부·철회). 기록이 없으면 null
    decided_at: datetime | None


class RefreshRequest(BaseModel):
    """쿠키를 못 쓰는 클라이언트용. 웹은 httpOnly 쿠키를 쓰므로 비워 둔다."""

    refresh_token: str | None = None


class UserOut(BaseModel):
    id: uuid.UUID
    name: str
    birth_date: date
    age: int
    gender: Literal["M", "F"]
    region_code: str
    region_name: str
    interests: list[str]
    intro: str
    has_location: bool
    # 필수 약관이 바뀌었거나 동의 기록이 없으면 true → 앱이 다시 동의 화면을 보여 준다
    consent_needed: bool
    # 마음 건강 기록(민감정보) 선택 동의 — false 면 자가 점검 결과를 저장하지 않는다
    health_consent: bool

    @classmethod
    def from_user(cls, user: User) -> "UserOut":
        return cls(
            id=user.id,
            name=user.name,
            birth_date=user.birth_date,
            age=age_on(user.birth_date, datetime.now(UTC).date()),
            gender=user.gender,  # type: ignore[arg-type]
            region_code=user.region_code,
            region_name=REGIONS.get(user.region_code, user.region_code),
            interests=[i.category for i in user.interests],
            intro=user.intro,
            has_location=user.geo_lat is not None,
            consent_needed=bool(AuthService.consent_needed(user)),
            health_consent=AuthService.has_consent(user, "health"),
        )


class LocationUpdate(BaseModel):
    """브라우저 GPS 좌표 — 서버에서 ≈1km 단위로 뭉개서 저장"""

    lat: float = Field(ge=33.0, le=39.0)  # 대한민국 범위
    lng: float = Field(ge=124.0, le=132.0)


class ProfileUpdate(BaseModel):
    """PATCH /me — 보낸 항목만 바뀐다"""

    intro: str | None = Field(None, max_length=INTRO_MAX_LEN)
    region_code: str | None = None
    interests: list[str] | None = Field(None, max_length=12)


class LoggedInResult(BaseModel):
    """기존 회원 — 바로 로그인 (refresh 토큰은 httpOnly 쿠키로)"""

    status: Literal["logged_in"] = "logged_in"
    access_token: str
    user: UserOut


class SignupRequiredResult(BaseModel):
    """신규 — 가입 단계로 (signup_token 은 짧게 유효)"""

    status: Literal["signup_required"] = "signup_required"
    signup_token: str
    name: str


# verify 응답: status 로 구분되는 둘 중 하나 → 프론트 타입도 구분되게 생성된다 (D3)
AuthResult = Annotated[LoggedInResult | SignupRequiredResult, Field(discriminator="status")]


class TokenResponse(BaseModel):
    access_token: str
    token_type: Literal["bearer"] = "bearer"


class Option(BaseModel):
    code: str
    label: str


class ConsentDocOut(BaseModel):
    kind: ConsentKind
    version: str
    required: bool


class SignupOptions(BaseModel):
    regions: list[Option]
    interests: list[Option]
    max_interests: int
    # 가입 동의 문서 — 화면은 본문(frontend shared/legal)을 보여 주고 이 버전으로 동의를 보낸다
    consents: list[ConsentDocOut]
    sms_provider: Literal["firebase"] | None = Field(
        default=None,
        description="인증 문자를 보내는 곳. firebase 면 인증 전에 '번호가 Google 로 간다'고 알린다",
    )


def consent_docs() -> list[ConsentDocOut]:
    return [
        ConsentDocOut(kind=k, version=CONSENT_VERSIONS[k], required=r)
        for k, r in CONSENT_DOCS.items()
    ]  # type: ignore[arg-type]


def consent_status(user: User) -> list[ConsentStatusOut]:
    state = AuthService.consent_state(user)
    return [
        ConsentStatusOut(
            kind=k,  # type: ignore[arg-type]
            version=CONSENT_VERSIONS[k],
            required=required,
            agreed=AuthService.has_consent(user, k),
            decided_at=state[k].created_at if state[k] else None,
        )
        for k, required in CONSENT_DOCS.items()
    ]


class WithdrawIn(BaseModel):
    reason: str | None = Field(
        default=None, max_length=WITHDRAW_REASON_MAX_LEN, description="고른 이유 (선택, 통계용)"
    )

    @field_validator("reason")
    @classmethod
    def _blank_is_none(cls, v: str | None) -> str | None:
        return (v or "").strip() or None


class WithdrawOut(BaseModel):
    delete_at: date = Field(description="이 날 개인정보가 완전히 지워진다 (탈퇴 + 30일, 한국 날짜)")
