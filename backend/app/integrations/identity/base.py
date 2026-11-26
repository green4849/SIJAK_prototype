"""본인인증 provider 인터페이스.

실제 PASS도 "인증 세션 시작 → 사용자가 인증 수행 → 결과 검증" 2단계라
start / verify 두 메서드로 추상화한다. service는 이 인터페이스에만 의존한다.
"""

from dataclasses import dataclass
from datetime import date
from typing import Literal, Protocol

Gender = Literal["M", "F"]


@dataclass(frozen=True)
class IdentityRequest:
    name: str
    birth_date: date
    phone: str
    gender: Gender


@dataclass(frozen=True)
class IdentitySession:
    session_id: str
    # Mock 전용: 화면에 보여줄 인증번호. 실제 provider는 None.
    dev_code: str | None = None
    # Firebase 전용: 브라우저가 Firebase 로 인증 문자를 보낼 번호(E.164, +8210…).
    # 문자는 서버가 아니라 브라우저의 Firebase 가 보낸다
    client_sms_to: str | None = None


@dataclass(frozen=True)
class VerifiedIdentity:
    ci: str  # 연계정보(Connecting Information) — 1인 1계정 판별 키
    name: str
    birth_date: date
    phone: str
    gender: Gender
    # 이 전화번호를 실제로 가진 사람인지 확인했는지 (문자 인증) — Mock 은 False
    phone_verified: bool = False


class IdentityVerificationFailed(Exception):
    """인증번호 불일치·세션 만료 등."""


class IdentityProvider(Protocol):
    async def start(self, req: IdentityRequest) -> IdentitySession: ...

    async def verify(self, session_id: str, code: str) -> VerifiedIdentity: ...
