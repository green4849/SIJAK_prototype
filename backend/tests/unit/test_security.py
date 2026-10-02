from datetime import timedelta

import pytest

from app.core.errors import UnauthorizedError
from app.core.security import create_token, decode_token, decrypt, encrypt, hash_phone


def test_encrypt_roundtrip_and_nonce_randomness() -> None:
    a, b = encrypt("01012345678"), encrypt("01012345678")
    assert a != b  # nonce가 매번 달라야 함
    assert decrypt(a) == decrypt(b) == "01012345678"


def test_hash_phone_ignores_formatting() -> None:
    assert hash_phone("010-1234-5678") == hash_phone("01012345678")
    assert hash_phone("01012345678") != hash_phone("01012345679")


def test_token_roundtrip() -> None:
    token, jti, _ = create_token("access", "user-1", timedelta(minutes=1))
    claims = decode_token(token, "access")
    assert claims["sub"] == "user-1" and claims["jti"] == jti


def test_token_type_mismatch_rejected() -> None:
    token, _, _ = create_token("refresh", "user-1", timedelta(minutes=1))
    with pytest.raises(UnauthorizedError):
        decode_token(token, "access")


def test_expired_token_rejected() -> None:
    token, _, _ = create_token("access", "user-1", timedelta(seconds=-1))
    with pytest.raises(UnauthorizedError) as e:
        decode_token(token, "access")
    assert e.value.code == "token_expired"
