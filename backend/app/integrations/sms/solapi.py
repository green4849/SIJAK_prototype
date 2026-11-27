"""솔라피(SOLAPI) 문자 발송 — 국내 문자. 발신번호는 솔라피에 미리 등록해야 한다(전기통신사업법).

API v4 단건 발송: POST https://api.solapi.com/messages/v4/send
  인증 헤더  Authorization: HMAC-SHA256 apiKey=<키>, date=<ISO8601>, salt=<무작위>, signature=<서명>
            서명 = hex(HMAC-SHA256(API Secret, date + salt))
  본문      {"message": {"to": "010…", "from": "발신번호", "text": "…"}}
  길이에 따라 SMS(한글 약 45자)·LMS 를 솔라피가 고른다.

※ 이 형식은 솔라피 공개 문서 기준으로 작성했다. 작업 환경에서 문서·API 에 접속하지 못해
   실제 키로는 아직 시험하지 않았다 — 키를 넣은 뒤 `python -m scripts.sms_test <번호>` 로 확인한다.
"""

import asyncio
import hashlib
import hmac
import json
import secrets
import urllib.error
import urllib.request
from datetime import UTC, datetime

from app.integrations.sms.base import SmsResult

SEND_URL = "https://api.solapi.com/messages/v4/send"
TIMEOUT_SEC = 8


def auth_header(
    api_key: str, api_secret: str, now: datetime | None = None, salt: str | None = None
) -> str:
    date = (now or datetime.now(UTC)).strftime("%Y-%m-%dT%H:%M:%SZ")
    salt = salt or secrets.token_hex(16)
    signature = hmac.new(api_secret.encode(), (date + salt).encode(), hashlib.sha256).hexdigest()
    return f"HMAC-SHA256 apiKey={api_key}, date={date}, salt={salt}, signature={signature}"


class SolapiSmsSender:
    name = "solapi"

    def __init__(self, api_key: str, api_secret: str, sender_number: str) -> None:
        self._key = api_key
        self._secret = api_secret
        self._from = sender_number

    def _post(self, to: str, text: str) -> SmsResult:
        body = json.dumps({"message": {"to": to, "from": self._from, "text": text}}).encode()
        req = urllib.request.Request(
            SEND_URL,
            data=body,
            method="POST",
            headers={
                "Authorization": auth_header(self._key, self._secret),
                "Content-Type": "application/json",
            },
        )
        try:
            with urllib.request.urlopen(req, timeout=TIMEOUT_SEC) as res:  # noqa: S310 — 고정 https 주소
                data = json.loads(res.read() or b"{}")
        except urllib.error.HTTPError as e:
            try:
                err = json.loads(e.read() or b"{}")
            except ValueError:
                err = {}
            code = err.get("errorCode") or f"HTTP {e.code}"
            return SmsResult(ok=False, error=f"{code}: {err.get('errorMessage', '')}"[:200])
        except (urllib.error.URLError, TimeoutError, OSError) as e:
            return SmsResult(ok=False, error=f"연결 실패: {type(e).__name__}")
        # 접수 성공이면 messageId 가 온다 (statusCode 2000 = 접수)
        message_id = data.get("messageId")
        status = str(data.get("statusCode", ""))
        if message_id and (not status or status.startswith("2")):
            return SmsResult(ok=True, message_id=str(message_id))
        return SmsResult(
            ok=False, error=f"접수 실패: {status} {data.get('statusMessage', '')}"[:200]
        )

    async def send(self, to: str, text: str) -> SmsResult:
        return await asyncio.to_thread(self._post, to, text)
