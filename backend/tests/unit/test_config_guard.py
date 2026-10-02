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
    "allow_mock_identity_in_prod": True,
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
        ("allow_mock_identity_in_prod", False, "IDENTITY_PROVIDER"),
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
    for name in [*names, "IDENTITY_PROVIDER"]:
        assert name in text
