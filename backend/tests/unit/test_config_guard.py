"""B1 — 운영(ENV=prod)에서 공개된 기본값·위험한 설정이면 서버가 뜨지 않는다."""

import base64
import os

import pytest
from pydantic import ValidationError

from app.core.config import _DEFAULT_ENCRYPTION_KEY, _DEFAULT_JWT_SECRET, Settings

SAFE_PROD = {
    "env": "prod",
    "jwt_secret": "x" * 48,
    "data_encryption_key": base64.b64encode(os.urandom(32)).decode(),
    "phone_hash_pepper": "p" * 24,
    "cors_origins": ["https://sijak.example.kr"],
    "auth_mode": "kakao",
    "kakao_rest_api_key": "test-key",
    "kakao_client_secret": "test-secret",
    "kakao_redirect_uri": "https://sijak.example.kr/login/kakao/callback",
}


def make(**overrides: object) -> Settings:
    # .env 파일은 읽지 않고 주어진 값만으로
    return Settings(_env_file=None, **{**SAFE_PROD, **overrides})  # type: ignore[arg-type]


def test_local_defaults_are_fine() -> None:
    s = Settings(_env_file=None, env="local")  # type: ignore[call-arg]
    assert s.cookie_secure is False


def test_safe_prod_starts_with_secure_cookie() -> None:
    assert make().cookie_secure is True


@pytest.mark.parametrize(
    ("field", "value", "message"),
    [
        ("jwt_secret", _DEFAULT_JWT_SECRET, "JWT_SECRET"),
        ("jwt_secret", "short", "JWT_SECRET"),
        ("data_encryption_key", _DEFAULT_ENCRYPTION_KEY, "DATA_ENCRYPTION_KEY"),
        ("data_encryption_key", "not-base64!!", "DATA_ENCRYPTION_KEY"),
        ("phone_hash_pepper", "change-me-pepper", "PHONE_HASH_PEPPER"),
        ("cors_origins", ["http://localhost:5173"], "CORS_ORIGINS"),
        ("auth_mode", "phone", "IDENTITY_PROVIDER=mock"),
        ("kakao_client_secret", None, "KAKAO_CLIENT_SECRET"),
        ("web_concurrency", 4, "WEB_CONCURRENCY"),
    ],
)
def test_unsafe_prod_refuses_to_start(field: str, value: object, message: str) -> None:
    with pytest.raises(ValidationError) as e:
        make(**{field: value})
    assert message in str(e.value)


def test_all_problems_reported_at_once() -> None:
    with pytest.raises(ValidationError) as e:
        Settings(_env_file=None, env="prod")  # type: ignore[call-arg]
    text = str(e.value)
    names = ["JWT_SECRET", "DATA_ENCRYPTION_KEY", "PHONE_HASH_PEPPER", "CORS_ORIGINS"]
    for name in [*names, "IDENTITY_PROVIDER=mock"]:
        assert name in text


def test_firebase_needs_web_config() -> None:
    with pytest.raises(ValidationError, match="FIREBASE_PROJECT_ID"):
        make(auth_mode="phone", identity_provider="firebase", allow_mock_identity_in_prod=False)
    ok = make(
        auth_mode="phone",
        identity_provider="firebase",
        allow_mock_identity_in_prod=False,
        firebase_project_id="sijak-6080",
        firebase_web_api_key="AIza-test",
        firebase_app_id="1:2:web:3",
    )
    assert ok.identity_provider == "firebase"


def test_prod_refuses_log_sms_and_incomplete_solapi() -> None:
    """C10 문자: 운영에서 '보낸 척'(log) 금지, solapi 는 키·시크릿·발신번호가 모두 있어야"""
    with pytest.raises(ValidationError, match="SMS_PROVIDER=log"):
        make(sms_provider="log")
    with pytest.raises(ValidationError, match="SOLAPI_API_SECRET, SMS_SENDER_NUMBER"):
        make(sms_provider="solapi", solapi_api_key="k")
    assert make(sms_provider="off").sms_provider == "off"
    ok = make(
        sms_provider="solapi",
        solapi_api_key="k",
        solapi_api_secret="s",
        sms_sender_number="0212345678",
    )
    assert ok.sms_provider == "solapi"
