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
from app.core.storage import get_media_storage
from app.jobs import run_daily

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
    result = await run_daily(SessionLocal, get_media_storage())
    print(result)
    return 0


async def loop() -> int:
    hour = get_settings().jobs_daily_hour_kst
    while True:
        wait = seconds_until_next_run(datetime.now(KST), hour)
        log.info("다음 예약 작업까지 %.0f분", wait / 60)
        await asyncio.sleep(wait)
        try:
            await run_daily(SessionLocal, get_media_storage())
        except Exception:  # noqa: BLE001 — 실패해도 다음 날 다시 돈다
            log.exception("예약 작업 실패")


def main() -> int:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(name)s %(levelname)s %(message)s")
    match sys.argv[1:]:
        case ["daily"]:
            return asyncio.run(daily())
        case ["loop"]:
            return asyncio.run(loop())
        case _:
            print("사용법: python -m scripts.jobs <daily|loop>", file=sys.stderr)
            return 2


if __name__ == "__main__":
    sys.exit(main())
