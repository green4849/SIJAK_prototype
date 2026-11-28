"""예약 알림의 날짜 경계와 사용자 설정을 확인한다 (운영 DB 없이)."""

import asyncio
import uuid
from datetime import date, timedelta
from types import SimpleNamespace

import pytest

from app import jobs


class _Session:
    def __init__(self) -> None:
        self.commits = 0

    async def __aenter__(self):
        return self

    async def __aexit__(self, *_):
        return False

    async def commit(self):
        self.commits += 1

    async def rollback(self):
        pass


def test_activity_reminders_use_tomorrow_in_korea_and_skip_inactive(monkeypatch) -> None:
    active_id, deleted_id, activity_id = uuid.uuid4(), uuid.uuid4(), uuid.uuid4()
    activity = SimpleNamespace(id=activity_id, title="동네 모임")
    bounds = []
    notified = []
    session = _Session()

    class ActivityRepo:
        async def applications_starting_between(self, start, end):
            bounds.append((start, end))
            return [(active_id, activity), (deleted_id, activity)]

    class Auth:
        async def get_users(self, ids):
            user_id = next(iter(ids))
            status = "active" if user_id == active_id else "deleted"
            return {user_id: SimpleNamespace(status=status)}

        @staticmethod
        def consent_needed(_):
            return []

    class Notifications:
        async def on_activity_reminder(self, user_id, aid, title, day):
            notified.append((user_id, aid, title, day))
            return True

    monkeypatch.setattr(jobs, "ActivityRepository", lambda _: ActivityRepo())
    monkeypatch.setattr(
        jobs, "_services", lambda *_: SimpleNamespace(auth=Auth(), notifications=Notifications())
    )

    assert asyncio.run(jobs.remind_activities(lambda: session, None, date(2026, 11, 28))) == 1
    assert bounds[0][0].date() == date(2026, 11, 29)
    assert bounds[0][0].utcoffset() == timedelta(hours=9)
    assert bounds[0][1] - bounds[0][0] == timedelta(days=1)
    assert notified == [(active_id, activity_id, "동네 모임", "2026-11-29")]
    assert session.commits == 1


def test_recommendations_respect_slot_and_available_candidates(monkeypatch) -> None:
    enabled_id, disabled_id = uuid.uuid4(), uuid.uuid4()
    notified = []
    session = _Session()

    class Auth:
        async def list_active_users(self):
            return [SimpleNamespace(id=enabled_id), SimpleNamespace(id=disabled_id)]

        async def get_active_user(self, user_id):
            return SimpleNamespace(id=user_id)

        @staticmethod
        def consent_needed(_):
            return []

    class Notifications:
        async def get(self, user_id):
            return SimpleNamespace(
                recommend_enabled=user_id == enabled_id, recommend_times=["morning"]
            )

        async def on_recommendation(self, user_id, day, slot):
            notified.append((user_id, day, slot))
            return True

    class Friends:
        async def recommend(self, _, tab):
            assert tab == "recommended"
            return [object()]

    async def drain():
        pass

    services = SimpleNamespace(auth=Auth(), notifications=Notifications(), friends=Friends())
    monkeypatch.setattr(jobs, "_services", lambda *_: services)
    monkeypatch.setattr(jobs.push, "drain", drain)

    result = asyncio.run(
        jobs.run_recommendations(lambda: session, None, "morning", date(2026, 11, 28))
    )
    assert result == 1
    assert notified == [(enabled_id, "2026-11-28", "morning")]
    assert session.commits == 1
    with pytest.raises(ValueError, match="알 수 없는 추천 시간"):
        asyncio.run(jobs.run_recommendations(lambda: session, None, "invalid"))
