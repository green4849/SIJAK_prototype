"""로컬 개발용 — 실제로 보내지 않고 로그에만 남긴다 (번호는 가려서).

운영(ENV=prod)에서는 쓸 수 없다(config 검사) — 보낸 척이 되면 안 되므로.
"""

import logging

from app.integrations.sms.base import SmsResult

log = logging.getLogger("sms")


class LogSmsSender:
    name = "log"

    def __init__(self) -> None:
        #: 시험에서 확인하려고 보낸 것을 모아 둔다 (번호, 본문)
        self.sent: list[tuple[str, str]] = []

    async def send(self, to: str, text: str) -> SmsResult:
        self.sent.append((to, text))
        log.info("[문자 — 보내지 않음] %s-****-%s %d자", to[:3], to[-4:], len(text))
        return SmsResult(ok=True, message_id=f"log-{len(self.sent)}")
