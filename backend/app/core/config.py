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

    # Auth (Stage 1에서 사용)
    jwt_secret: str = "change-me"
    access_token_minutes: int = 30
    refresh_token_days: int = 14


@lru_cache
def get_settings() -> Settings:
    return Settings()
