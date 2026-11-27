"""문자 발송 설정 확인 — 실제로 한 통 보낸다 (긴급 도움과 같은 provider·발신번호).

    cd backend && uv run python -m scripts.sms_test 01012345678

SMS_PROVIDER=solapi 와 SOLAPI_API_KEY·SOLAPI_API_SECRET·SMS_SENDER_NUMBER 가 있어야 한다.
받는 번호는 본인 번호로 — 결과(성공/실패 이유)만 찍고 키는 찍지 않는다.
"""

import asyncio
import sys

from app.core.security import normalize_phone
from app.integrations.sms import get_sms_sender


async def main(to: str) -> int:
    sender = get_sms_sender()
    if sender is None:
        print("SMS_PROVIDER=off — 문자 발송이 꺼져 있어요.", file=sys.stderr)
        return 2
    r = await sender.send(normalize_phone(to), "[시작] 문자 발송 설정 확인용 시험 문자예요.")
    print(f"{sender.name}: {'보냄 ' + str(r.message_id) if r.ok else '실패 — ' + str(r.error)}")
    return 0 if r.ok else 1


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("사용법: python -m scripts.sms_test <받는 번호>", file=sys.stderr)
        sys.exit(2)
    sys.exit(asyncio.run(main(sys.argv[1])))
