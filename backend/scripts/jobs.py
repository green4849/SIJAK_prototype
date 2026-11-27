"""예약 작업 실행기 (B3·C11) — 내용은 app/jobs.py.

    cd backend && uv run python -m scripts.jobs daily   # 지금 한 번
    cd backend && uv run python -m scripts.jobs loop    # 매일 JOBS_DAILY_HOUR_KST 시(기본 4시)

운영에서는 docker-compose.prod.yml 의 jobs 서비스가 `loop` 로 계속 돈다 (서버 cron 필요 없음).
한 번의 실패로 멈추지 않고 다음 날 다시 돈다. 작업은 여러 번 돌려도 같은 결과가 되게 짜여 있다.
"""

import asyncio
import logging
import sys
from datetime import datetime, time, timedelta, timezone

from app.core.config import get_settings
from app.core.database import SessionLocal
from app.core.observability import init_observability, report_exception
from app.core.storage import get_media_storage
from app.jobs import retry_sos_sms, run_daily

KST = timezone(timedelta(hours=9))
log = logging.getLogger("jobs")


def seconds_until_next_run(now: datetime, hour_kst: int) -> float:
    """다음 실행(한국 시각 hour_kst:00)까지 남은 초 — 지금이 그 시각을 지났으면 내일"""
    local = now.astimezone(KST)
    target = datetime.combine(local.date(), time(hour_kst), tzinfo=KST)
    if target <= local:
        target += timedelta(days=1)
    return (target - local).total_seconds()


async def daily() -> int:
    try:
        result = await run_daily(SessionLocal, get_media_storage())
    except Exception as exc:
        report_exception(exc, "daily_jobs")
        return 1
    print(result)
    return 0


#: 못 보낸 긴급 도움 문자를 다시 보내는 간격 (loop 모드)
SOS_RETRY_EVERY_SEC = 120


async def sos_retry() -> int:
    try:
        print(await retry_sos_sms(SessionLocal))
    except Exception as exc:
        report_exception(exc, "sos_retry")
        return 1
    return 0


async def _sos_retry_loop() -> None:
    while True:
        await asyncio.sleep(SOS_RETRY_EVERY_SEC)
        try:
            await retry_sos_sms(SessionLocal)
        except Exception as exc:  # noqa: BLE001 — 다음 차례에 다시
            report_exception(exc, "sos_retry")


async def loop() -> int:
    # 매일 정리 작업과 함께, 몇 분마다 못 보낸 긴급 도움 문자를 다시 보낸다
    retry = asyncio.create_task(_sos_retry_loop())
    try:
        return await _daily_loop()
    finally:
        retry.cancel()


async def _daily_loop() -> int:
    hour = get_settings().jobs_daily_hour_kst
    while True:
        wait = seconds_until_next_run(datetime.now(KST), hour)
        log.info("다음 예약 작업까지 %.0f분", wait / 60)
        await asyncio.sleep(wait)
        try:
            await run_daily(SessionLocal, get_media_storage())
        except Exception as exc:  # noqa: BLE001 — 실패해도 다음 날 다시 돈다
            report_exception(exc, "daily_jobs")


def main() -> int:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(name)s %(levelname)s %(message)s")
    init_observability()
    match sys.argv[1:]:
        case ["daily"]:
            return asyncio.run(daily())
        case ["loop"]:
            return asyncio.run(loop())
        case ["sos-retry"]:
            return asyncio.run(sos_retry())
        case _:
            print("사용법: python -m scripts.jobs <daily|loop|sos-retry>", file=sys.stderr)
            return 2


if __name__ == "__main__":
    sys.exit(main())
