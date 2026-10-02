"""앱 설정. 모든 환경값은 여기서만 읽는다 (docs/dev-order.md §2-6)."""

from functools import lru_cache
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


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
    jwt_secret: str = "change-me-local-only-32bytes-minimum!!"
    jwt_algorithm: str = "HS256"
    access_token_minutes: int = 30
    refresh_token_days: int = 14
    signup_token_minutes: int = 10
    refresh_cookie_name: str = "wipi_refresh"
    cookie_secure: bool = False  # prod(HTTPS)에서는 True

    # 개인정보 보호 — 휴대전화 AES-256-GCM 암호화 키(base64 32바이트) / 검색용 해시 pepper
    data_encryption_key: str = "MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY="
    phone_hash_pepper: str = "change-me-pepper"

    # 본인인증 provider: "mock" | (추후) "pass"
    identity_provider: Literal["mock"] = "mock"

    # 가입 최소 연령 — 서비스 대상은 60+, 시연·테스트 시 .env에서 0으로 낮출 수 있음
    min_signup_age: int = 60


@lru_cache
def get_settings() -> Settings:
    return Settings()
