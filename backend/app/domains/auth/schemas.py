"""auth API 요청/응답 스키마 (HTTP 계약)."""

import uuid
from datetime import UTC, date, datetime
from typing import Annotated, Literal

from pydantic import BaseModel, Field, field_validator

from app.core.security import normalize_phone
from app.domains.auth.constants import INTRO_MAX_LEN, REGIONS
from app.domains.auth.models import User
from app.domains.auth.service import age_on


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
            raise ValueError("휴대전화 번호를 다시 확인해 주세요.")
        return digits


class PassStartResponse(BaseModel):
    session_id: str
    dev_code: str | None = Field(description="Mock 인증 전용 — 실제 PASS에서는 항상 null")


class PassVerifyRequest(BaseModel):
    session_id: str
    code: str = Field(min_length=6, max_length=6, pattern=r"^\d{6}$")


class SignupRequest(BaseModel):
    signup_token: str
    region_code: str
    interests: list[str] = Field(default_factory=list, max_length=12)


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


class SignupOptions(BaseModel):
    regions: list[Option]
    interests: list[Option]
    max_interests: int
