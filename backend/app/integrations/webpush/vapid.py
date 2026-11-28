"""표준 Web Push (RFC 8030·8291) + VAPID(RFC 8292) — pywebpush.

푸시 서비스(구글 FCM·모질라·애플 등)가 각 브라우저로 전해 준다. 계정 없이 VAPID 키 한 쌍만 필요.
pywebpush 는 requests(동기)라 스레드에서 돌린다.
"""

import asyncio
import logging

from pywebpush import WebPushException, webpush

from app.integrations.webpush.base import PushResult, PushTarget

log = logging.getLogger("webpush")

#: 푸시 서비스 하나가 늦어도 다른 기기 발송을 오래 붙잡지 않게
TIMEOUT_SEC = 10


class VapidPushSender:
    name = "vapid"

    def __init__(self, private_key: str, subject: str) -> None:
        self._private_key = private_key
        self._claims = {"sub": subject}

    def _send(self, target: PushTarget, payload: str, ttl: int, urgency: str) -> PushResult:
        try:
            webpush(
                subscription_info={
                    "endpoint": target.endpoint,
                    "keys": {"p256dh": target.p256dh, "auth": target.auth},
                },
                data=payload,
                vapid_private_key=self._private_key,
                # pywebpush 가 aud 를 채우며 dict 를 고치므로 매번 새로
                vapid_claims=dict(self._claims),
                ttl=ttl,
                headers={"Urgency": urgency},
                timeout=TIMEOUT_SEC,
            )
        except WebPushException as exc:
            status = exc.response.status_code if exc.response is not None else None
            if status in (404, 410):
                return PushResult(ok=False, gone=True, error=f"구독 만료 ({status})")
            return PushResult(ok=False, error=f"푸시 서비스 오류 ({status or '응답 없음'})")
        except Exception as exc:  # 네트워크·키 형식 등 — 다른 기기 발송은 계속
            log.warning("Web Push 실패: %s", type(exc).__name__)
            return PushResult(ok=False, error=type(exc).__name__)
        return PushResult(ok=True)

    async def send(self, target: PushTarget, payload: str, ttl: int, urgency: str) -> PushResult:
        return await asyncio.to_thread(self._send, target, payload, ttl, urgency)
