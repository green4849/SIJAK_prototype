"""앱 설정. 모든 환경값은 여기서만 읽는다 (docs/dev-order.md §2-6)."""

import base64
import binascii
from functools import lru_cache
from typing import Literal, Self

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# 저장소에 공개된 기본값 — 운영(ENV=prod)에서는 하나라도 남아 있으면 서버가 뜨지 않는다 (B1)
_DEFAULT_JWT_SECRET = "change-me-local-only-32bytes-minimum!!"
_DEFAULT_ENCRYPTION_KEY = "MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY="
_DEFAULT_PEPPER = "change-me-pepper"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=("../.env", ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "wipi"
    env: Literal["local", "test", "prod"] = "local"
    api_prefix: str = "/api/v1"

    # DB
    database_url: str = "postgresql+asyncpg://wipi:wipi@localhost:5432/wipi"

    # CORS — 프론트 dev 서버
    cors_origins: list[str] = ["http://localhost:5173"]

    # Auth — 보고서는 RS256이지만 프로토타입은 HS256 (키 1개로 운영 단순화)
    jwt_secret: str = _DEFAULT_JWT_SECRET
    jwt_algorithm: str = "HS256"
    access_token_minutes: int = 30
    refresh_token_days: int = 14
    signup_token_minutes: int = 10
    refresh_cookie_name: str = "wipi_refresh"
    cookie_secure: bool = False  # prod 에서는 자동으로 True (HTTPS 전용 쿠키)

    # 개인정보 보호 — 휴대전화 AES-256-GCM 암호화 키(base64 32바이트) / 검색용 해시 pepper
    data_encryption_key: str = _DEFAULT_ENCRYPTION_KEY
    phone_hash_pepper: str = _DEFAULT_PEPPER

    # 본인인증 provider: "mock" | (추후) "pass"
    identity_provider: Literal["mock"] = "mock"
    # 운영에서 Mock 인증(누구나 화면의 인증번호로 가입)은 기본 금지.
    # 실제 인증 계약 전 시범 운영일 때만 true
    allow_mock_identity_in_prod: bool = False

    # 음성 메시지 등 업로드 파일 저장 위치 (backend/ 기준, git 제외)
    media_dir: str = "data/media"
    voice_max_bytes: int = 2_000_000  # 약 1~2분 분량

    # 요청 횟수 제한 (B2). 규칙은 각 router, 저장은 core/ratelimit (지금은 메모리)
    rate_limit_enabled: bool = True

    # 가입 최소 연령 — 서비스 대상은 60+, 시연·테스트 시 .env에서 0으로 낮출 수 있음
    min_signup_age: int = 60

    @model_validator(mode="after")
    def _guard_prod(self) -> Self:
        """운영 환경 안전장치 — 문제를 모두 모아 한 번에 알려 주고 기동을 막는다."""
        if self.env != "prod":
            return self

        problems: list[str] = []
        if self.jwt_secret == _DEFAULT_JWT_SECRET or len(self.jwt_secret) < 32:
            problems.append("JWT_SECRET: 기본값이거나 32자 미만")
        if self.data_encryption_key == _DEFAULT_ENCRYPTION_KEY:
            problems.append("DATA_ENCRYPTION_KEY: 기본값 (전화번호 암호화 키)")
        elif not _is_32_byte_base64(self.data_encryption_key):
            problems.append("DATA_ENCRYPTION_KEY: base64로 인코딩한 32바이트가 아님")
        if self.phone_hash_pepper == _DEFAULT_PEPPER or len(self.phone_hash_pepper) < 16:
            problems.append("PHONE_HASH_PEPPER: 기본값이거나 16자 미만")
        if any(not o.startswith("https://") for o in self.cors_origins):
            problems.append("CORS_ORIGINS: 운영에서는 https:// 주소만")
        if self.identity_provider == "mock" and not self.allow_mock_identity_in_prod:
            problems.append(
                "IDENTITY_PROVIDER=mock: 누구나 가입할 수 있음 "
                "(시범 운영이면 ALLOW_MOCK_IDENTITY_IN_PROD=true)"
            )
        if problems:
            raise ValueError("운영 설정을 확인하세요 (ENV=prod):\n  - " + "\n  - ".join(problems))

        # HTTPS 전용 쿠키는 운영에서 항상
        self.cookie_secure = True
        return self


def _is_32_byte_base64(value: str) -> bool:
    try:
        return len(base64.b64decode(value, validate=True)) == 32
    except (binascii.Error, ValueError):
        return False


@lru_cache
def get_settings() -> Settings:
    return Settings()
