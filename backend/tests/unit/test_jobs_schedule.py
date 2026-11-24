"""예약 작업 실행 시각 — 매일 한국 시각 정해진 시에"""

from datetime import UTC, datetime, timedelta, timezone

from scripts.jobs import seconds_until_next_run

KST = timezone(timedelta(hours=9))


def test_waits_until_today_if_before() -> None:
    assert seconds_until_next_run(datetime(2026, 11, 24, 3, 30, tzinfo=KST), 4) == 30 * 60


def test_waits_until_tomorrow_if_passed() -> None:
    now = datetime(2026, 11, 24, 4, 0, tzinfo=KST)  # 정각이면 방금 돈 것 — 내일
    assert seconds_until_next_run(now, 4) == 24 * 3600


def test_utc_input() -> None:
    # 한국 3시 = UTC 전날 18시
    now = datetime(2026, 11, 23, 18, 0, tzinfo=UTC)
    assert seconds_until_next_run(now, 4) == 3600
