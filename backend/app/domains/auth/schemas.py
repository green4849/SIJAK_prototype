"""auth API 요청/응답 스키마 (HTTP 계약)."""

import uuid
from datetime import date
from typing import Literal

from pydantic import BaseModel, Field, field_validator

from app.core.security import normalize_phone
from app.domains.auth.constants import REGIONS
from app.domains.auth.models import User


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
    dev_code: str | None = Field(None, description="Mock 인증 전용 — 실제 PASS에서는 항상 null")


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
    gender: Literal["M", "F"]
    region_code: str
    region_name: str
    interests: list[str]

    @classmethod
    def from_user(cls, user: User) -> "UserOut":
        return cls(
            id=user.id,
            name=user.name,
            birth_date=user.birth_date,
            gender=user.gender,  # type: ignore[arg-type]
            region_code=user.region_code,
            region_name=REGIONS.get(user.region_code, user.region_code),
            interests=[i.category for i in user.interests],
        )


class AuthResult(BaseModel):
    """verify 결과: 기존 회원이면 status=logged_in, 신규면 status=signup_required."""

    status: Literal["logged_in", "signup_required"]
    access_token: str | None = None
    user: UserOut | None = None
    signup_token: str | None = None
    name: str | None = None


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
