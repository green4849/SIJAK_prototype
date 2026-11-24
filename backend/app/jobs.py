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
from datetime import UTC, date, datetime

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.storage import LocalMediaStorage
from app.domains.activity.repository import ActivityRepository
from app.domains.activity.service import ActivityService
from app.domains.auth.repository import AuthRepository
from app.domains.auth.service import AuthService
from app.domains.chat.repository import ChatRepository
from app.domains.chat.service import ChatService
from app.domains.friend.repository import FriendRepository
from app.domains.friend.service import FriendService
from app.domains.notification.repository import NotificationRepository
from app.domains.notification.service import NotificationService
from app.domains.point.repository import PointRepository
from app.domains.point.service import PointService
from app.domains.risk.repository import RiskRepository
from app.domains.risk.service import RiskService
from app.domains.wellbeing.repository import WellbeingRepository
from app.domains.wellbeing.service import WellbeingService
from app.integrations.identity import get_identity_provider

log = logging.getLogger("jobs")

SessionFactory = Callable[[], AsyncSession]


@dataclass(frozen=True)
class _Services:
    auth: AuthService
    chat: ChatService
    wellbeing: WellbeingService


def _services(session: AsyncSession, storage: LocalMediaStorage) -> _Services:
    auth = AuthService(AuthRepository(session), get_identity_provider())
    risk = RiskService(RiskRepository(session))
    points = PointService(PointRepository(session))
    notifications = NotificationService(NotificationRepository(session))
    friends = FriendService(FriendRepository(session), auth, risk, points, notifications)
    chat = ChatService(ChatRepository(session), auth, friends, risk, storage, notifications)
    activities = ActivityService(ActivityRepository(session), points, notifications)
    wellbeing = WellbeingService(WellbeingRepository(session), chat, friends, activities)
    return _Services(auth, chat, wellbeing)


async def purge_withdrawn(
    sessions: SessionFactory, storage: LocalMediaStorage, today: date | None = None
) -> int:
    """완전 삭제일이 된 탈퇴 계정을 지운다 (B3). 그 분이 있던 대화방의 음성 파일도 함께."""
    purged = 0
    async with sessions() as session:
        s = _services(session, storage)
        for user in await s.auth.withdrawn_due(today):
            keys = await s.chat.voice_keys_in_rooms_of(user.id)
            await s.auth.purge_withdrawn(user)  # 여기서 커밋 — 성공한 뒤에만 파일을 지운다
            s.chat.delete_voice_files(keys)
            purged += 1
    return purged


async def expire_voice(
    sessions: SessionFactory, storage: LocalMediaStorage, now: datetime | None = None
) -> int:
    """보관 기간이 지난 음성 메시지 파일을 지운다 (B3)"""
    async with sessions() as session:
        return await _services(session, storage).chat.expire_old_voice(now or datetime.now(UTC))


async def refresh_relation_index(sessions: SessionFactory, storage: LocalMediaStorage) -> int:
    """이용 중인 모든 분의 사회적 관계 지수를 계산해 이번 주 값으로 남긴다 (C11).

    한 분에서 오류가 나도 나머지는 계속한다.
    """
    done = 0
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
            except Exception:  # noqa: BLE001 — 한 분의 실패로 전체를 멈추지 않는다
                log.exception("관계 지수 계산 실패: %s", user.id)
                await session.rollback()
    return done


async def run_daily(sessions: SessionFactory, storage: LocalMediaStorage) -> dict[str, int]:
    result = {
        "purged_users": await purge_withdrawn(sessions, storage),
        "expired_voice": await expire_voice(sessions, storage),
        "relation_index": await refresh_relation_index(sessions, storage),
    }
    log.info("예약 작업 끝: %s", result)
    return result
