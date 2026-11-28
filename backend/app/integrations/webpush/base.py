"""휴대폰 알림(Web Push) 발송 인터페이스 (C4).

서비스는 이 인터페이스에만 의존한다. 구현체: vapid(pywebpush — 표준 Web Push + VAPID 서명).
실패는 예외가 아니라 결과로 돌려준다 — 기기 여러 대 중 하나가 실패해도 나머지는 보내야 해서.
"""

from dataclasses import dataclass
from typing import Protocol


@dataclass(frozen=True)
class PushTarget:
    """기기(브라우저) 하나의 구독 — 브라우저 PushSubscription 그대로"""

    endpoint: str
    p256dh: str
    auth: str


@dataclass(frozen=True)
class PushResult:
    ok: bool
    #: 구독이 끝남(404·410) — 이 기기 구독을 지워야 한다
    gone: bool = False
    #: 실패 이유 — 사람이 읽을 짧은 문구. 주소·키·본문은 넣지 않는다
    error: str | None = None


class PushSender(Protocol):
    #: 기록에 남길 이름 ("vapid")
    name: str

    async def send(self, target: PushTarget, payload: str, ttl: int, urgency: str) -> PushResult:
        """payload: 서비스 워커가 받을 JSON 문자열. 네트워크 오류도 PushResult(ok=False)로."""
        ...
