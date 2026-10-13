"""포인트 (C12). 다른 도메인은 earn / spend / cancel 로만 포인트를 움직인다.

- 이 서비스는 커밋하지 않는다 → 부른 쪽(친구 신청·평가·봉사 신청)의 커밋과
  함께 저장되거나 함께 취소된다.
  (요청 하나에 DB 세션 하나를 같이 쓴다)
- 금액 규칙은 여기 한 곳에 모은다. 화면은 GET /points 의 값으로 안내 문구를 만든다.
"""

import uuid
from dataclasses import dataclass
from datetime import UTC, date, datetime, time, timedelta, timezone

from app.core.config import get_settings
from app.core.errors import DomainError
from app.domains.point.models import PointEntry
from app.domains.point.repository import PointRepository

KST = timezone(timedelta(hours=9))

WELCOME_BONUS = 100
RATING_REWARD = 10
RATING_DAILY_LIMIT = 5
VOLUNTEER_REWARD = 100
FIRST_FRIENDS_REWARD = 500
FRIEND_REQUEST_COST = 30


class InsufficientPointsError(DomainError):
    status_code = 402
    code = "insufficient_points"


@dataclass(frozen=True)
class PointSummary:
    balance: int
    friend_request_cost: int
    #: 다음 친구 신청이 무료인지 (첫 신청이거나 무료 기간)
    next_request_free: bool
    #: 체험 기간 — 이 날짜(한국 날짜)까지 포인트를 쓰지 않는다. 없으면 None
    free_until: date | None
    rating_reward: int
    ratings_left_today: int
    volunteer_reward: int
    first_friends_reward: int


@dataclass(frozen=True)
class Earned:
    #: 실제로 들어온 포인트 (하루 상한·이미 받음이면 0)
    amount: int


def kst_today() -> date:
    return datetime.now(KST).date()


def _kst_midnight_utc(d: date) -> datetime:
    return datetime.combine(d, time(0), tzinfo=KST).astimezone(UTC)


class PointService:
    def __init__(self, repo: PointRepository) -> None:
        self.repo = repo

    # ---------- 조회 ----------

    async def summary(self, user_id: uuid.UUID) -> PointSummary:
        await self._ensure_welcome(user_id)
        await self.repo.commit()
        return PointSummary(
            balance=await self.repo.balance(user_id),
            friend_request_cost=FRIEND_REQUEST_COST,
            next_request_free=self.in_free_period() or not await self._used_first_free(user_id),
            free_until=get_settings().point_free_until,
            rating_reward=RATING_REWARD,
            ratings_left_today=await self.ratings_left_today(user_id),
            volunteer_reward=VOLUNTEER_REWARD,
            first_friends_reward=FIRST_FRIENDS_REWARD,
        )

    async def history(self, user_id: uuid.UUID, limit: int = 30) -> list[PointEntry]:
        await self._ensure_welcome(user_id)
        await self.repo.commit()
        return await self.repo.history(user_id, limit)

    async def ratings_left_today(self, user_id: uuid.UUID) -> int:
        used = await self.repo.count_reason(user_id, "rating", since=_kst_midnight_utc(kst_today()))
        return max(0, RATING_DAILY_LIMIT - used)

    @staticmethod
    def in_free_period() -> bool:
        until = get_settings().point_free_until
        return until is not None and kst_today() <= until

    # ---------- 다른 도메인용 ----------

    async def earn_rating(self, user_id: uuid.UUID, target_id: uuid.UUID, memo: str) -> Earned:
        """추천 친구 평가 — 같은 사람은 한 번만, 하루 RATING_DAILY_LIMIT 번까지"""
        await self.repo.lock_user(user_id)
        if await self.ratings_left_today(user_id) <= 0:
            return Earned(0)
        return await self._earn(user_id, RATING_REWARD, "rating", f"rating:{target_id}", memo)

    async def earn_volunteer(self, user_id: uuid.UUID, activity_id: uuid.UUID, memo: str) -> Earned:
        return await self._earn(
            user_id, VOLUNTEER_REWARD, "volunteer", f"volunteer:{activity_id}", memo
        )

    async def cancel_volunteer(self, user_id: uuid.UUID, activity_id: uuid.UUID) -> None:
        """봉사 신청 취소 — 받은 포인트를 되돌린다 (참석 확인 전이므로 기록째 지움)"""
        await self.repo.remove(user_id, f"volunteer:{activity_id}")

    async def earn_first_friends(self, user_id: uuid.UUID) -> Earned:
        return await self._earn(
            user_id, FIRST_FRIENDS_REWARD, "mission_first_friends", "mission:first_friends", ""
        )

    async def has_earned_first_friends(self, user_id: uuid.UUID) -> bool:
        return await self.repo.has_ref(user_id, "mission:first_friends")

    async def charge_friend_request(
        self, user_id: uuid.UUID, target_id: uuid.UUID, memo: str
    ) -> None:
        """친구 신청 비용. 같은 사람에게 다시 신청해도 한 번만 낸다.

        첫 신청·무료 기간에는 0P로 기록(내역에 '무료'로 보이게). 모자라면 InsufficientPointsError.
        """
        ref = f"friend_request:{target_id}"
        await self.repo.lock_user(user_id)
        await self._ensure_welcome(user_id)
        if await self.repo.has_ref(user_id, ref):
            return
        free = self.in_free_period() or not await self._used_first_free(user_id)
        cost = 0 if free else FRIEND_REQUEST_COST
        if cost and await self.repo.balance(user_id) < cost:
            raise InsufficientPointsError(f"친구 신청에는 {cost}P가 필요해요.")
        await self.repo.add(user_id, -cost, "friend_request", ref, memo)

    async def commit(self) -> None:
        """자기 저장소가 없는 호출자(mission)가 포인트 변경만 저장할 때"""
        await self.repo.commit()

    # ---------- 내부 ----------

    async def _earn(
        self, user_id: uuid.UUID, amount: int, reason: str, ref: str, memo: str
    ) -> Earned:
        await self._ensure_welcome(user_id)
        added = await self.repo.add(user_id, amount, reason, ref, memo)
        return Earned(amount if added else 0)

    async def _ensure_welcome(self, user_id: uuid.UUID) -> None:
        await self.repo.add(user_id, WELCOME_BONUS, "welcome", "welcome", "")

    async def _used_first_free(self, user_id: uuid.UUID) -> bool:
        """첫 친구 신청 무료를 이미 썼는지 = 친구 신청 기록이 하나라도 있는지"""
        return await self.repo.count_reason(user_id, "friend_request") > 0
