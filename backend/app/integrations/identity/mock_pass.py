"""PASS 본인인증 Mock.

- 인증번호 6자리를 생성해 응답(dev_code)으로 돌려준다 (실제라면 SMS/PASS 앱).
- CI는 (이름, 생년월일, 전화번호)로 결정적으로 만든다 → 같은 사람이 다시 인증하면 같은 CI.
- 세션은 프로세스 메모리에 둔다 (단일 프로세스 프로토타입 전제).
"""

import base64
import hashlib
import secrets
import time
from dataclasses import dataclass

from app.integrations.identity.base import (
    IdentityRequest,
    IdentitySession,
    IdentityVerificationFailed,
    VerifiedIdentity,
)

SESSION_TTL_SEC = 180
MAX_ATTEMPTS = 5


@dataclass
class _Pending:
    req: IdentityRequest
    code: str
    expires_at: float
    attempts: int = 0


class MockPassProvider:
    def __init__(self) -> None:
        self._sessions: dict[str, _Pending] = {}

    async def start(self, req: IdentityRequest) -> IdentitySession:
        self._gc()
        session_id = secrets.token_urlsafe(16)
        code = f"{secrets.randbelow(1_000_000):06d}"
        self._sessions[session_id] = _Pending(req, code, time.monotonic() + SESSION_TTL_SEC)
        return IdentitySession(session_id=session_id, dev_code=code)

    async def verify(self, session_id: str, code: str) -> VerifiedIdentity:
        pending = self._sessions.get(session_id)
        if pending is None or pending.expires_at < time.monotonic():
            self._sessions.pop(session_id, None)
            raise IdentityVerificationFailed("인증 시간이 지났어요. 처음부터 다시 해 주세요.")

        pending.attempts += 1
        if pending.code != code.strip():
            if pending.attempts >= MAX_ATTEMPTS:
                self._sessions.pop(session_id, None)
                raise IdentityVerificationFailed(
                    "인증번호를 여러 번 틀렸어요. 처음부터 다시 해 주세요."
                )
            raise IdentityVerificationFailed("인증번호가 맞지 않아요. 다시 확인해 주세요.")

        del self._sessions[session_id]
        r = pending.req
        return VerifiedIdentity(
            ci=self._make_ci(r),
            name=r.name,
            birth_date=r.birth_date,
            phone=r.phone,
            gender=r.gender,
        )

    @staticmethod
    def _make_ci(r: IdentityRequest) -> str:
        digits = "".join(ch for ch in r.phone if ch.isdigit())
        raw = f"mock-ci|{r.name}|{r.birth_date.isoformat()}|{digits}".encode()
        # 실제 CI는 88자 base64 — 형식을 맞춘다 (sha512 64바이트 → base64 88자)
        return base64.b64encode(hashlib.sha512(raw).digest()).decode()

    def _gc(self) -> None:
        now = time.monotonic()
        for sid in [k for k, v in self._sessions.items() if v.expires_at < now]:
            del self._sessions[sid]
