"""예약 작업 (B3·C11) — HTTP 없이 도메인 서비스를 조립해 하루 한 번 돈다.

    run_daily = ① 탈퇴 30일 지난 계정 완전 삭제
                ② 보관 기간 지난 음성 파일 정리
                ③ 사회적 관계 지수 일괄 계산

- 실행: `scripts/jobs.py` — 한 번은 `daily`, 서버에서 계속은 `loop`
  (docker-compose.prod 의 jobs 서비스)
- 조립은 router 의 의존성과 같은 순서로 여기서만 한다.
  각 작업은 여러 번 돌려도 같은 결과가 되게 짰다.
- 관계 지수는 '주간' 값이지만 매일 계산해 그 주 값을 덮어 쓴다 → 화면을 안 여는 분도
  운영자 돌봄 목록에 빠지지 않고 들어온다 (B7).
"""

import logging
from collections.abc import Callable
from dataclasses import dataclass
from datetime import UTC, date, datetime, time, timedelta, timezone

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.observability import report_exception
from app.core.storage import MediaStorage
from app.domains.activity.repository import ActivityRepository
from app.domains.activity.service import ActivityService
from app.domains.auth.repository import AuthRepository
from app.domains.auth.service import AuthService
from app.domains.chat.repository import ChatRepository
from app.domains.chat.service import ChatService
from app.domains.emergency.repository import EmergencyRepository
from app.domains.emergency.service import EmergencyService
from app.domains.friend.repository import FriendRepository
from app.domains.friend.service import FriendService
from app.domains.notification import push
from app.domains.notification.repository import NotificationRepository
from app.domains.notification.service import NotificationService
from app.domains.point.repository import PointRepository
from app.domains.point.service import PointService
from app.domains.risk.repository import RiskRepository
from app.domains.risk.service import RiskService
from app.domains.wellbeing.repository import WellbeingRepository
from app.domains.wellbeing.service import WellbeingService
from app.integrations.identity import get_identity_provider
from app.integrations.sms import get_sms_sender
from app.integrations.sms.base import SmsSender

log = logging.getLogger("jobs")
KST = timezone(timedelta(hours=9))

SessionFactory = Callable[[], AsyncSession]


@dataclass(frozen=True)
class _Services:
    auth: AuthService
    chat: ChatService
    wellbeing: WellbeingService
    friends: FriendService
    activities: ActivityService
    notifications: NotificationService


def _services(session: AsyncSession, storage: MediaStorage) -> _Services:
    auth = AuthService(AuthRepository(session), get_identity_provider())
    risk = RiskService(RiskRepository(session))
    points = PointService(PointRepository(session))
    notifications = NotificationService(NotificationRepository(session))
    friends = FriendService(FriendRepository(session), auth, risk, points, notifications)
    chat = ChatService(ChatRepository(session), auth, friends, risk, storage, notifications)
    activities = ActivityService(ActivityRepository(session), points, notifications)
    wellbeing = WellbeingService(
        WellbeingRepository(session), chat, friends, activities, notifications
    )
    return _Services(auth, chat, wellbeing, friends, activities, notifications)


async def remind_activities(
    sessions: SessionFactory, storage: MediaStorage, today: date | None = None
) -> int:
    """한국 날짜 기준 내일 시작하는 활동의 신청자에게 한 번씩 알린다."""
    tomorrow = (today or datetime.now(KST).date()) + timedelta(days=1)
    start = datetime.combine(tomorrow, time.min, tzinfo=KST)
    end = start + timedelta(days=1)
    async with sessions() as session:
        rows = await ActivityRepository(session).applications_starting_between(start, end)
        applications = [(user_id, a.id, a.title) for user_id, a in rows]
    sent = failures = 0
    for user_id, activity_id, title in applications:
        async with sessions() as session:
            try:
                s = _services(session, storage)
                users = await s.auth.get_users({user_id})
                if (
                    user_id not in users
                    or users[user_id].status != "active"
                    or s.auth.consent_needed(users[user_id])
                ):
                    continue
                if await s.notifications.on_activity_reminder(
                    user_id, activity_id, title, tomorrow.isoformat()
                ):
                    sent += 1
                await session.commit()
            except Exception as exc:  # noqa: BLE001 — 다른 신청자에게는 계속
                failures += 1
                report_exception(exc, "activity_reminder")
                await session.rollback()
    if failures:
        raise RuntimeError(f"활동 알림 실패 {failures}건")
    return sent


async def run_recommendations(
    sessions: SessionFactory, storage: MediaStorage, slot: str, today: date | None = None
) -> int:
    """고른 시간에 추천 이웃이 있는 회원만 알린다. ref로 중복 실행을 막는다."""
    from app.domains.notification.models import TIME_SLOTS

    if slot not in TIME_SLOTS:
        raise ValueError("알 수 없는 추천 시간")
    day = (today or datetime.now(KST).date()).isoformat()
    async with sessions() as session:
        user_ids = [u.id for u in await _services(session, storage).auth.list_active_users()]
    sent = failures = 0
    for user_id in user_ids:
        async with sessions() as session:
            try:
                s = _services(session, storage)
                prefs = await s.notifications.get(user_id)
                if not prefs.recommend_enabled or slot not in prefs.recommend_times:
                    continue
                me = await s.auth.get_active_user(user_id)
                if s.auth.consent_needed(me):
                    continue
                if not await s.friends.recommend(me, "recommended"):
                    continue
                if await s.notifications.on_recommendation(user_id, day, slot):
                    sent += 1
                await session.commit()
            except Exception as exc:  # noqa: BLE001 — 다른 회원에게는 계속
                failures += 1
                report_exception(exc, "recommendation_reminder")
                await session.rollback()
    await push.drain()
    if failures:
        raise RuntimeError(f"추천 알림 실패 {failures}건")
    return sent


async def purge_withdrawn(
    sessions: SessionFactory, storage: MediaStorage, today: date | None = None
) -> int:
    """완전 삭제일이 된 탈퇴 계정을 지운다 (B3). 그 분이 있던 대화방의 음성 파일도 함께."""
    purged = 0
    async with sessions() as session:
        s = _services(session, storage)
        for user in await s.auth.withdrawn_due(today):
            keys = await s.chat.voice_keys_in_rooms_of(user.id)
            await s.chat.queue_voice_deletions(keys)
            await s.auth.purge_withdrawn(user)  # 여기서 커밋 — 성공한 뒤에만 파일을 지운다
            await s.chat.drain_media_deletions()
            purged += 1
        await s.chat.drain_media_deletions()
    return purged


async def expire_voice(
    sessions: SessionFactory, storage: MediaStorage, now: datetime | None = None
) -> int:
    """보관 기간이 지난 음성 메시지 파일을 지운다 (B3)"""
    async with sessions() as session:
        return await _services(session, storage).chat.expire_old_voice(now or datetime.now(UTC))


async def refresh_relation_index(sessions: SessionFactory, storage: MediaStorage) -> int:
    """이용 중인 모든 분의 사회적 관계 지수를 계산해 이번 주 값으로 남긴다 (C11).

    한 분에서 오류가 나도 나머지는 계속한다.
    """
    done = 0
    failures = 0
    async with sessions() as session:
        s = _services(session, storage)
        users = await s.auth.list_active_users()
    for user in users:
        async with sessions() as session:
            s = _services(session, storage)
            try:
                me = await s.auth.get_active_user(user.id)
                await s.wellbeing.relation_index(me)
                done += 1
            except Exception as exc:  # noqa: BLE001 — 한 분의 실패로 전체를 멈추지 않는다
                failures += 1
                report_exception(exc, "relation_index")
                await session.rollback()
    if failures:
        raise RuntimeError(f"관계 지수 계산 실패 {failures}건")
    return done


async def _run_daily(sessions: SessionFactory, storage: MediaStorage) -> dict[str, int]:
    result: dict[str, int] = {}
    failures = 0
    for name, task in (
        ("purged_users", purge_withdrawn),
        ("expired_voice", expire_voice),
        ("relation_index", refresh_relation_index),
        ("activity_reminders", remind_activities),
    ):
        try:
            result[name] = await task(sessions, storage)
        except Exception as exc:
            failures += 1
            report_exception(exc, name)
    log.info("예약 작업 결과: %s", result)
    if failures:
        raise RuntimeError(f"예약 작업 실패 {failures}건")
    return result


async def run_daily(sessions: SessionFactory, storage: MediaStorage) -> dict[str, int]:
    # 세션 락은 사용자 삭제 중 발생하는 도메인 커밋과 독립된 연결에서 유지한다.
    async with sessions() as guard:
        connection = await guard.connection()
        locked = await connection.scalar(text("SELECT pg_try_advisory_lock(608020261125)"))
        if not locked:
            raise RuntimeError("예약 작업이 이미 실행 중입니다")
        try:
            result = await _run_daily(sessions, storage)
            # 작업 중 쌓인 소식의 휴대폰 알림(백그라운드)이 끝난 뒤에 마친다
            await push.drain()
            return result
        finally:
            await connection.execute(text("SELECT pg_advisory_unlock(608020261125)"))


#: 긴급 도움 문자 재시도는 이 시간 안의 요청만 — 한참 지난 '긴급' 문자는 오히려 혼란을 준다
SOS_RETRY_WINDOW = timedelta(hours=1)


async def retry_sos_sms(
    sessions: SessionFactory, sms: SmsSender | None = None, now: datetime | None = None
) -> dict[str, int]:
    """못 보낸 긴급 도움 문자 다시 보내기 — 몇 분마다 (`python -m scripts.jobs sos-retry`).

    여러 번 동시에 돌아도 같은 문자를 두 번 보내지 않는다 (행 잠금 skip locked).
    """
    since = (now or datetime.now(UTC)) - SOS_RETRY_WINDOW
    async with sessions() as session:
        service = EmergencyService(EmergencyRepository(session), sms or get_sms_sender())
        r = await service.retry_deliveries(since)
    result = {"sos_sms_sent": r.sent, "sos_sms_failed": r.failed}
    if r.tried:
        log.info("긴급 도움 문자 재시도: %s", result)
    return result
