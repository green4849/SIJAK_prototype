"""토큰·암호화 유틸. 순수 함수만 둔다 (DB·HTTP 의존 없음)."""

import base64
import hashlib
import hmac
import os
import uuid
from datetime import UTC, datetime, timedelta
from typing import Any, Literal

import jwt
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

from app.core.config import get_settings
from app.core.errors import UnauthorizedError

TokenType = Literal["access", "refresh", "signup"]


# ---------- JWT ----------


def create_token(
    token_type: TokenType,
    subject: str,
    expires_in: timedelta,
    extra: dict[str, Any] | None = None,
) -> tuple[str, str, datetime]:
    """(token, jti, expires_at) 반환. jti는 refresh 토큰 폐기 추적에 쓴다."""
    s = get_settings()
    now = datetime.now(UTC)
    exp = now + expires_in
    jti = uuid.uuid4().hex
    payload = {"sub": subject, "typ": token_type, "jti": jti, "iat": now, "exp": exp}
    if extra:
        payload.update(extra)
    return jwt.encode(payload, s.jwt_secret, algorithm=s.jwt_algorithm), jti, exp


def decode_token(token: str, expected_type: TokenType) -> dict[str, Any]:
    s = get_settings()
    try:
        payload = jwt.decode(token, s.jwt_secret, algorithms=[s.jwt_algorithm])
    except jwt.ExpiredSignatureError as e:
        raise UnauthorizedError(
            "인증이 만료되었어요. 다시 확인해 주세요.", code="token_expired"
        ) from e
    except jwt.InvalidTokenError as e:
        raise UnauthorizedError("인증 정보가 올바르지 않아요.", code="invalid_token") from e
    if payload.get("typ") != expected_type:
        raise UnauthorizedError("인증 정보가 올바르지 않아요.", code="invalid_token")
    return payload


# ---------- 개인정보 보호 (보고서 4.3.2) ----------


def _aes() -> AESGCM:
    key = base64.b64decode(get_settings().data_encryption_key)
    if len(key) != 32:
        raise ValueError("DATA_ENCRYPTION_KEY must be base64 of 32 bytes (AES-256)")
    return AESGCM(key)


def encrypt(plaintext: str) -> bytes:
    """AES-256-GCM. 저장 형식: nonce(12) || ciphertext+tag."""
    nonce = os.urandom(12)
    return nonce + _aes().encrypt(nonce, plaintext.encode(), None)


def decrypt(blob: bytes) -> str:
    return _aes().decrypt(blob[:12], blob[12:], None).decode()


def hash_phone(phone: str) -> str:
    """중복 검사용 해시. 평문 SHA-256은 전화번호 공간이 작아 역산 가능 → pepper를 쓴 HMAC."""
    pepper = get_settings().phone_hash_pepper.encode()
    return hmac.new(pepper, normalize_phone(phone).encode(), hashlib.sha256).hexdigest()


def normalize_phone(phone: str) -> str:
    return "".join(ch for ch in phone if ch.isdigit())
