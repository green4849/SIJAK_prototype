"""문자 발송 provider 인터페이스 (C10 긴급 도움 → 보호자 문자).

서비스는 이 인터페이스에만 의존한다. 구현체: log(로컬 개발 — 보내지 않고 기록만), solapi.
실패는 예외가 아니라 결과로 돌려준다 — 보호자 여러 명 중 한 명이 실패해도 나머지는 보내야 해서.
"""

from dataclasses import dataclass
from typing import Protocol


@dataclass(frozen=True)
class SmsResult:
    ok: bool
    #: provider 가 준 메시지 id (성공 시)
    message_id: str | None = None
    #: 실패 이유 — 사람이 읽을 짧은 문구. 전화번호·본문은 넣지 않는다
    error: str | None = None


class SmsSender(Protocol):
    #: 화면·기록에 남길 이름 ("log", "solapi")
    name: str

    async def send(self, to: str, text: str) -> SmsResult:
        """to: 숫자만(01012345678). 네트워크 오류도 SmsResult(ok=False)로 돌려준다."""
        ...
