"""앱 설정. 모든 환경값은 여기서만 읽는다 (docs/dev-order.md §2-6)."""

import base64
import binascii
from datetime import date
from functools import lru_cache
from typing import Literal, Self
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

from pydantic import field_validator, model_validator
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
        hide_input_in_errors=True,
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
    # 회전 직후 이 시간 안에 옛 refresh 토큰이 다시 오면 탈취가 아니라 동시 요청으로 본다
    # (홈 화면 앱과 브라우저 탭이 거의 같이 갱신) → 전체 로그아웃 대신 그 요청만 거절
    refresh_reuse_grace_seconds: int = 30
    signup_token_minutes: int = 10
    refresh_cookie_name: str = "wipi_refresh"
    cookie_secure: bool = False  # prod 에서는 자동으로 True (HTTPS 전용 쿠키)

    # 개인정보 보호 — 휴대전화 AES-256-GCM 암호화 키(base64 32바이트) / 검색용 해시 pepper
    data_encryption_key: str = _DEFAULT_ENCRYPTION_KEY
    phone_hash_pepper: str = _DEFAULT_PEPPER

    # 본인인증 provider: "mock"(화면에 번호) | "firebase"(Firebase 전화 인증 문자) | (추후) "pass"
    identity_provider: Literal["mock", "firebase"] = "mock"
    # Firebase 전화 인증 (B4) — 웹 설정값은 비밀이 아니다(브라우저에 그대로 내려간다).
    # 서버는 Firebase 가 준 확인 토큰을 Google 공개키로 검증만 하므로 서비스 계정 키가 필요 없다.
    firebase_project_id: str = ""
    firebase_web_api_key: str = ""
    firebase_app_id: str = ""
    # 비우면 <project_id>.firebaseapp.com
    firebase_auth_domain: str = ""
    # 운영에서 Mock 인증(누구나 화면의 인증번호로 가입)은 기본 금지.
    # 실제 인증 계약 전 시범 운영일 때만 true
    allow_mock_identity_in_prod: bool = False

    # 음성 메시지 등 업로드 파일 저장 위치 (backend/ 기준, git 제외)
    media_dir: str = "data/media"
    media_storage: Literal["local", "s3"] = "local"
    media_s3_bucket: str | None = None
    media_s3_endpoint: str | None = None
    media_s3_region: str = "ap-southeast-1"
    media_s3_prefix: str = "voice/"
    sentry_dsn: str | None = None
    release: str = "development"
    backup_encryption_key: str | None = None
    backup_s3_bucket: str | None = None
    backup_s3_endpoint: str | None = None
    backup_s3_region: str = "ap-southeast-1"
    restore_database_url: str | None = None
    pg_tools_container: str | None = None
    # 이전 암호화 키는 복호화에만 사용. 실제 값은 환경 변수에만 둔다.
    data_encryption_previous_keys: list[str] = []

    # 긴급 도움 → 보호자 문자 (C10). "off"(기본): 기록만
    # · "log": 로컬 개발 — 보내지 않고 로그만 (운영 금지)
    # · "solapi": 실제 발송 — 솔라피 API 키·시크릿과 솔라피에 등록한 발신번호가 필요하다
    sms_provider: Literal["off", "log", "solapi"] = "off"
    sms_sender_number: str = ""
    solapi_api_key: str = ""
    solapi_api_secret: str = ""

    # 휴대폰 알림 Web Push (C4). 두 키가 모두 있어야 보낸다 — 만들기: scripts.vapid_keys
    # · 공개 키는 화면에 내려간다(구독에 씀). 비밀 키는 서버에만
    # · subject: 푸시 서비스가 문제 있을 때 연락할 곳 — mailto:주소 또는 https://사이트
    vapid_public_key: str = ""
    vapid_private_key: str = ""
    vapid_subject: str = "https://sijak-6080.onrender.com"

    voice_max_bytes: int = 2_000_000  # 약 1~2분 분량
    # 음성 메시지 파일 보관 기간 (B3, 보고서 4.6.3) — 지나면 예약 작업이 파일을 지운다
    voice_retention_days: int = 90
    # 예약 작업(scripts.jobs loop)이 매일 도는 한국 시각 (새벽, 사용이 적을 때)
    jobs_daily_hour_kst: int = 4

    # 요청 횟수 제한 (B2). 규칙은 각 router, 저장은 core/ratelimit (지금은 메모리)
    rate_limit_enabled: bool = True
    # uvicorn 워커 수 (docker-entrypoint.sh 와 같은 환경 변수). 요청 제한을 프로세스 메모리에 세므로
    # 워커가 여럿이면 워커마다 따로 세어 제한이 그만큼 느슨해진다 → 운영에서 막는다 (H42)
    web_concurrency: int = 1

    # 포인트 (C12) — 체험단 기간: 이 날짜(한국 날짜)까지 친구 신청에 포인트를 쓰지 않는다.
    # 비우면 체험 기간 없음
    point_free_until: date | None = None

    # 공공데이터포털 인증키 (C7 노인복지시설 가져오기) — 사용자가 발급해 환경 변수로만.
    # 없으면 가져오기 스크립트가 실행되지 않는다
    public_data_api_key: str | None = None

    # 가입 최소 연령 — 서비스 대상은 60+, 시연·테스트 시 .env에서 0으로 낮출 수 있음
    min_signup_age: int = 60

    @field_validator("media_s3_endpoint", "backup_s3_endpoint", "sentry_dsn", mode="before")
    @classmethod
    def _optional_endpoint(cls, value: str | None) -> str | None:
        return value or None

    @field_validator("data_encryption_previous_keys")
    @classmethod
    def _previous_keys(cls, values: list[str]) -> list[str]:
        if len(values) > 5 or not all(_is_32_byte_base64(key) for key in values):
            raise ValueError("이전 암호화 키는 base64 32바이트, 최대 5개")
        return values

    @field_validator("database_url")
    @classmethod
    def _asyncpg_url(cls, value: str) -> str:
        return to_asyncpg_url(value)

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
        if self.identity_provider == "firebase":
            missing = [
                name
                for name, value in (
                    ("FIREBASE_PROJECT_ID", self.firebase_project_id),
                    ("FIREBASE_WEB_API_KEY", self.firebase_web_api_key),
                    ("FIREBASE_APP_ID", self.firebase_app_id),
                )
                if not value
            ]
            if missing:
                problems.append(f"IDENTITY_PROVIDER=firebase: {', '.join(missing)} 가 비어 있음")
        if self.identity_provider == "mock" and not self.allow_mock_identity_in_prod:
            problems.append(
                "IDENTITY_PROVIDER=mock: 누구나 가입할 수 있음 "
                "(시범 운영이면 ALLOW_MOCK_IDENTITY_IN_PROD=true)"
            )
        if self.sms_provider == "log":
            problems.append(
                "SMS_PROVIDER=log: 문자를 보내지 않고 보낸 것처럼 기록됨 (off 또는 solapi)"
            )
        if self.sms_provider == "solapi":
            missing = [
                name
                for name, value in (
                    ("SOLAPI_API_KEY", self.solapi_api_key),
                    ("SOLAPI_API_SECRET", self.solapi_api_secret),
                    ("SMS_SENDER_NUMBER", self.sms_sender_number),
                )
                if not value
            ]
            if missing:
                problems.append(f"SMS_PROVIDER=solapi: {', '.join(missing)} 가 비어 있음")
        if bool(self.vapid_public_key) != bool(self.vapid_private_key):
            problems.append("VAPID_PUBLIC_KEY·VAPID_PRIVATE_KEY: 둘 다 넣거나 둘 다 비우기")
        if self.vapid_private_key and not self.vapid_subject.startswith(("mailto:", "https://")):
            problems.append("VAPID_SUBJECT: mailto:주소 또는 https:// 주소")
        if self.rate_limit_enabled and self.web_concurrency > 1:
            problems.append(
                "WEB_CONCURRENCY>1: 요청 횟수 제한을 워커마다 따로 셈 "
                "(1로 두거나, 공유 저장소(Redis, B9)로 바꾼 뒤 늘리기)"
            )
        for name, endpoint in (
            ("MEDIA_S3_ENDPOINT", self.media_s3_endpoint),
            ("BACKUP_S3_ENDPOINT", self.backup_s3_endpoint),
        ):
            if endpoint and not endpoint.startswith("https://"):
                problems.append(f"{name}: 운영에서는 https:// 주소만")
        if problems:
            raise ValueError("운영 설정을 확인하세요 (ENV=prod):\n  - " + "\n  - ".join(problems))

        # HTTPS 전용 쿠키는 운영에서 항상
        self.cookie_secure = True
        return self


def to_asyncpg_url(url: str) -> str:
    """호스팅 DB(Neon·Render 등)가 주는 주소를 그대로 붙여 넣어도 되게 asyncpg 용으로 바꾼다.

    - `postgres://`·`postgresql://` → `postgresql+asyncpg://`
    - libpq 옵션 `sslmode=require` → asyncpg 의 `ssl=require`
    - asyncpg 가 모르는 `channel_binding` 은 뺀다 (그대로 두면 연결할 때 오류)
    다른 드라이버(`postgresql+psycopg://` 등)를 적은 주소는 건드리지 않는다.
    """
    parts = urlsplit(url)
    scheme = parts.scheme
    if scheme in ("postgres", "postgresql"):
        scheme = "postgresql+asyncpg"
    if scheme != "postgresql+asyncpg":
        return url
    query = []
    for key, val in parse_qsl(parts.query, keep_blank_values=True):
        if key == "channel_binding":
            continue
        query.append(("ssl" if key == "sslmode" else key, val))
    return urlunsplit((scheme, parts.netloc, parts.path, urlencode(query), parts.fragment))


def _is_32_byte_base64(value: str) -> bool:
    try:
        return len(base64.b64decode(value, validate=True)) == 32
    except (binascii.Error, ValueError):
        return False


@lru_cache
def get_settings() -> Settings:
    return Settings()
