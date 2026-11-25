"""Firebase 전화 인증 provider (B4 — 실제 PASS 계약 전, 시범 운영용 문자 인증).

흐름
  1) start  : 서버가 입력(이름·생년월일·번호·성별)을 세션에 잠깐 두고,
             문자 보낼 번호(+82…)를 돌려준다
  2) 브라우저 : Firebase JS SDK 가 그 번호로 인증 문자를 보내고, 사용자가 받은 6자리로 확인
             → Firebase 가 'ID 토큰'(그 번호를 가진 사람이라는 증명)을 준다
  3) verify : 서버가 ID 토큰을 Google 공개키로 검증하고, 토큰의 번호가 1)의 번호와 같은지 본다

- 문자 발송·재전송 제한·reCAPTCHA 는 Firebase 가 맡는다.
  서버는 토큰 검증만 → 서비스 계정 키가 필요 없다.
- 검증 규칙은 Firebase 문서 'Verify ID tokens using a third-party JWT library' 를 따른다:
  RS256, kid 가 Google 공개키에 있음, aud=프로젝트 id, iss=https://securetoken.google.com/<프로젝트>,
  sub(=uid) 있음, exp 미래·iat·auth_time 과거.
- CI(1인 1계정 키)는 문자로 확인한 번호로 만든다. 브라우저는 토큰을 받은 뒤
  Firebase 쪽 사용자 기록을 바로 지우므로(번호를 Google 에 남겨 두지 않기)
  다음 인증 때 uid 가 바뀔 수 있어서다.
- 이름·생년월일·성별은 본인이 적은 값이다(문자 인증은 번호만 확인한다). 실제 본인 확인은 PASS(B4).
"""

import asyncio
import base64
import hashlib
import json
import secrets
import time
import urllib.request
from collections.abc import Awaitable, Callable
from dataclasses import dataclass

import jwt
from cryptography.x509 import load_pem_x509_certificate

from app.integrations.identity.base import (
    IdentityRequest,
    IdentitySession,
    IdentityVerificationFailed,
    VerifiedIdentity,
)

GOOGLE_CERTS_URL = (
    "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com"
)
# 문자를 받고 6자리를 적는 데 넉넉히
SESSION_TTL_SEC = 600
# 문자 확인 직후의 토큰만 받는다 (오래된 토큰 재사용 막기)
MAX_AUTH_AGE_SEC = 600
CLOCK_SKEW_SEC = 60

#: kid → PEM 인증서
CertFetcher = Callable[[], Awaitable[dict[str, str]]]


def to_e164_kr(phone_digits: str) -> str:
    """01012345678 → +821012345678 (한국 휴대폰만 받는다 — PassStartRequest 가 01 로 시작을 검사)"""
    return "+82" + phone_digits.removeprefix("0")


@dataclass
class _Pending:
    req: IdentityRequest
    phone_e164: str
    expires_at: float


class _GoogleCerts:
    """Google 공개키 — 응답의 Cache-Control max-age 동안 다시 받지 않는다"""

    def __init__(self) -> None:
        self._certs: dict[str, str] = {}
        self._until = 0.0
        self._lock = asyncio.Lock()

    async def __call__(self) -> dict[str, str]:
        async with self._lock:
            if time.monotonic() < self._until and self._certs:
                return self._certs
            certs, max_age = await asyncio.to_thread(self._fetch)
            self._certs, self._until = certs, time.monotonic() + max_age
            return certs

    @staticmethod
    def _fetch() -> tuple[dict[str, str], int]:
        with urllib.request.urlopen(GOOGLE_CERTS_URL, timeout=5) as res:  # noqa: S310 — 고정 주소
            body = json.loads(res.read())
            cache = res.headers.get("Cache-Control", "")
        max_age = 3600
        for part in cache.split(","):
            k, _, v = part.strip().partition("=")
            if k == "max-age" and v.isdigit():
                max_age = int(v)
        return body, max_age


class FirebasePhoneProvider:
    def __init__(self, project_id: str, fetch_certs: CertFetcher | None = None) -> None:
        if not project_id:
            raise ValueError("FIREBASE_PROJECT_ID 가 필요해요")
        self.project_id = project_id
        self._fetch_certs = fetch_certs or _GoogleCerts()
        self._sessions: dict[str, _Pending] = {}

    async def start(self, req: IdentityRequest) -> IdentitySession:
        self._gc()
        session_id = secrets.token_urlsafe(16)
        phone = to_e164_kr("".join(ch for ch in req.phone if ch.isdigit()))
        self._sessions[session_id] = _Pending(req, phone, time.monotonic() + SESSION_TTL_SEC)
        return IdentitySession(session_id=session_id, client_sms_to=phone)

    async def verify(self, session_id: str, code: str) -> VerifiedIdentity:
        """code 자리에 Firebase ID 토큰이 온다"""
        pending = self._sessions.get(session_id)
        if pending is None or pending.expires_at < time.monotonic():
            self._sessions.pop(session_id, None)
            raise IdentityVerificationFailed("인증 시간이 지났어요. 처음부터 다시 해 주세요.")

        claims = await self._decode(code.strip())
        if claims.get("phone_number") != pending.phone_e164:
            # 다른 번호로 받은 토큰 — 세션은 남겨 두지 않는다
            self._sessions.pop(session_id, None)
            raise IdentityVerificationFailed("인증한 번호가 처음에 적은 번호와 달라요.")

        del self._sessions[session_id]
        r = pending.req
        return VerifiedIdentity(
            ci=self._make_ci(pending.phone_e164),
            name=r.name,
            birth_date=r.birth_date,
            phone=r.phone,
            gender=r.gender,
            phone_verified=True,
        )

    async def _decode(self, token: str) -> dict:
        fail = IdentityVerificationFailed("인증을 확인하지 못했어요. 처음부터 다시 해 주세요.")
        try:
            kid = jwt.get_unverified_header(token).get("kid")
        except jwt.InvalidTokenError as e:
            raise fail from e
        try:
            certs = await self._fetch_certs()
        except Exception as e:  # 네트워크 — 사용자가 다시 시도할 수 있게
            raise IdentityVerificationFailed(
                "인증 서버에 연결하지 못했어요. 잠시 뒤 다시 해 주세요."
            ) from e
        pem = certs.get(kid or "")
        if pem is None:
            raise fail
        key = load_pem_x509_certificate(pem.encode()).public_key()
        try:
            claims = jwt.decode(
                token,
                key,  # type: ignore[arg-type]
                algorithms=["RS256"],
                audience=self.project_id,
                issuer=f"https://securetoken.google.com/{self.project_id}",
                leeway=CLOCK_SKEW_SEC,
                options={"require": ["exp", "iat", "aud", "iss", "sub", "auth_time"]},
            )
        except jwt.InvalidTokenError as e:
            raise fail from e
        now = time.time()
        if not claims.get("sub") or claims["auth_time"] > now + CLOCK_SKEW_SEC:
            raise fail
        if now - claims["auth_time"] > MAX_AUTH_AGE_SEC:
            raise IdentityVerificationFailed("인증한 지 오래됐어요. 처음부터 다시 해 주세요.")
        return claims

    @staticmethod
    def _make_ci(phone_e164: str) -> str:
        # 실제 CI 형식(88자 base64)에 맞춘다
        raw = f"firebase-phone|{phone_e164}".encode()
        return base64.b64encode(hashlib.sha512(raw).digest()).decode()

    def _gc(self) -> None:
        now = time.monotonic()
        for sid in [k for k, v in self._sessions.items() if v.expires_at < now]:
            del self._sessions[sid]
