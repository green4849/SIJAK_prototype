"""친구 찾기·신청 (④). 사용자 정보는 AuthService(공개 메서드)로만 얻는다."""

import uuid
from dataclasses import dataclass
from typing import TYPE_CHECKING, Literal

from app.core.errors import ConflictError, DomainError, ForbiddenError, NotFoundError
from app.domains.auth.service import AuthService
from app.domains.friend.models import FriendRequest
from app.domains.friend.nearby import find_nearby
from app.domains.friend.repository import FriendRepository
from app.domains.point.service import PointService
from app.domains.risk.service import RiskService

if TYPE_CHECKING:
    from app.domains.auth.models import User

Relation = Literal["none", "sent", "received", "friends"]
Tab = Literal["recommended", "nearby"]
Rating = Literal["like", "neutral", "dislike"]
MAX_RESULTS = 30
# 평가 반영 (C12): 추천 탭에서 '만나보고 싶어요' 먼저, 평가 안 한 사람, '그저 그래요' 순.
# '잘 안 맞아요'는 추천 탭에서 다시 보이지 않는다 (같은 동네 탭은 거리 목록이라 그대로)
_RATING_ORDER = {"like": 0, None: 1, "neutral": 2}
# '만나보고 싶어요'를 받은 사람들의 관심사를 가진 사람은 조금 더 앞으로
_LIKED_INTEREST_WEIGHT = 0.5


@dataclass(frozen=True)
class Candidate:
    user: "User"
    relation: Relation
    request_id: uuid.UUID | None
    common_interests: list[str]
    distance_km: float | None = None
    my_rating: Rating | None = None


@dataclass(frozen=True)
class RatingResult:
    rating: Rating
    points_earned: int
    ratings_left_today: int


class CannotRequestSelfError(DomainError):
    code = "cannot_request_self"


class FriendService:
    def __init__(
        self, repo: FriendRepository, auth: AuthService, risk: RiskService, points: PointService
    ) -> None:
        self.repo = repo
        self.auth = auth
        self.risk = risk
        self.points = points

    # ---------- 추천 ----------

    async def recommend(self, me: "User", tab: Tab) -> list[Candidate]:
        relations = await self._relations(me.id)
        # 이미 친구인 사람은 추천에서 뺀다 (친구 목록에서 따로 보여 줌)
        exclude = {me.id} | {uid for uid, (rel, _) in relations.items() if rel == "friends"}
        exclude |= await self._blocked_ids(me.id)
        my_interests = {i.category for i in me.interests}
        ratings = await self.repo.ratings_by(me.id)

        if tab == "nearby":
            pool = await self.auth.list_active_users(exclude_ids=exclude)
            found = find_nearby(me, pool)
            pairs = [(n.user, n.distance_km) for n in found]
            # 거리가 있으면 가까운 순, 없으면 최근 접속 순(조회 순서 유지)
            pairs.sort(key=lambda p: (p[1] is None, p[1] or 0))
        else:
            disliked = {uid for uid, r in ratings.items() if r == "dislike"}
            pool = await self.auth.list_active_users(exclude_ids=exclude | disliked)
            liked_interests = {
                i.category for u in pool if ratings.get(u.id) == "like" for i in u.interests
            }

            def score(u: "User") -> float:
                theirs = {i.category for i in u.interests}
                return len(my_interests & theirs) + _LIKED_INTEREST_WEIGHT * len(
                    liked_interests & theirs
                )

            pairs = [(u, None) for u in pool]
            # 평가 → 관심사 점수 높은 순 → 같은 지역 우선
            pairs.sort(
                key=lambda p: (
                    _RATING_ORDER[ratings.get(p[0].id)],
                    -score(p[0]),
                    p[0].region_code != me.region_code,
                )
            )

        return [
            self._candidate(u, my_interests, relations, distance, ratings.get(u.id))
            for u, distance in pairs[:MAX_RESULTS]
        ]

    # ---------- 평가 (C12) ----------

    async def rate(self, me: "User", target_id: uuid.UUID, rating: Rating) -> RatingResult:
        """추천 친구 평가.

        처음 평가하는 사람이면 포인트(하루 상한까지). 평가를 바꿔도 포인트는 한 번만.
        """
        if target_id == me.id:
            raise CannotRequestSelfError("나는 평가할 수 없어요.")
        target = await self.auth.get_active_user(target_id)
        await self.repo.set_rating(me.id, target_id, rating)
        earned = await self.points.earn_rating(me.id, target_id, f"{target.name}님 평가")
        await self.repo.commit()
        return RatingResult(
            rating=rating,
            points_earned=earned.amount,
            ratings_left_today=await self.points.ratings_left_today(me.id),
        )

    # ---------- 신청 ----------

    async def send_request(self, me: "User", to_id: uuid.UUID) -> Candidate:
        if to_id == me.id:
            raise CannotRequestSelfError("나에게는 신청할 수 없어요.")
        target = await self.auth.get_active_user(to_id)
        if to_id in await self._blocked_ids(me.id):
            raise ForbiddenError("신청할 수 없는 분이에요.", code="blocked")

        existing = await self.repo.get_between(me.id, to_id)
        for req in existing:
            if req.status == "accepted":
                raise ConflictError("이미 친구예요.", code="already_friends")
            if req.status == "pending" and req.to_user_id == me.id:
                # 상대가 먼저 신청했으면 바로 친구가 된다
                await self.repo.set_status(req, "accepted")
                await self.repo.commit()
                return await self._candidate_for(me, target)
            if req.status == "pending" and req.from_user_id == me.id:
                return await self._candidate_for(me, target)  # 중복 신청은 무시
        # 새 신청 — 포인트 (C12). 모자라면 여기서 멈추고 아무것도 저장하지 않는다
        await self.points.charge_friend_request(me.id, to_id, f"{target.name}님께 친구 신청")
        # 거절됐던 내 신청이 있으면 다시 대기로
        mine = next((r for r in existing if r.from_user_id == me.id), None)
        if mine:
            await self.repo.set_status(mine, "pending")
        else:
            await self.repo.add(me.id, to_id)
        await self.repo.commit()
        return await self._candidate_for(me, target)

    async def respond(self, me: "User", request_id: uuid.UUID, accept: bool) -> FriendRequest:
        req = await self.repo.get(request_id)
        if req is None or req.to_user_id != me.id or req.status != "pending":
            raise NotFoundError("이미 처리됐거나 없는 신청이에요.")
        await self.repo.set_status(req, "accepted" if accept else "declined")
        await self.repo.commit()
        return req

    # ---------- 목록 ----------

    async def list_friends(self, me: "User") -> list[Candidate]:
        return await self._list_by_relation(me, "friends")

    async def list_received(self, me: "User") -> list[Candidate]:
        return await self._list_by_relation(me, "received")

    # ---------- 다른 도메인용 공개 메서드 ----------

    async def are_friends(self, a: uuid.UUID, b: uuid.UUID) -> bool:
        return any(r.status == "accepted" for r in await self.repo.get_between(a, b))

    async def friend_ids(self, user_id: uuid.UUID) -> set[uuid.UUID]:
        rel = await self._relations(user_id)
        return {uid for uid, (r, _) in rel.items() if r == "friends"}

    # ---------- 내부 ----------

    async def _blocked_ids(self, user_id: uuid.UUID) -> set[uuid.UUID]:
        """차단 관계(양방향) — 추천·친구 목록·신청에서 모두 제외"""
        return await self.risk.related_block_ids(user_id)

    async def _relations(self, me_id: uuid.UUID) -> dict[uuid.UUID, tuple[Relation, uuid.UUID]]:
        out: dict[uuid.UUID, tuple[Relation, uuid.UUID]] = {}
        for r in await self.repo.list_involving(me_id):
            other = r.to_user_id if r.from_user_id == me_id else r.from_user_id
            if r.status == "accepted":
                out[other] = ("friends", r.id)
            elif r.status == "pending" and other not in out:
                out[other] = ("sent" if r.from_user_id == me_id else "received", r.id)
        return out

    async def _list_by_relation(self, me: "User", wanted: Relation) -> list[Candidate]:
        relations = await self._relations(me.id)
        ids = {uid for uid, (rel, _) in relations.items() if rel == wanted}
        ids -= await self._blocked_ids(me.id)
        users = await self.auth.get_users(ids)
        mine = {i.category for i in me.interests}
        return [self._candidate(u, mine, relations) for u in users.values()]

    async def _candidate_for(self, me: "User", other: "User") -> Candidate:
        return self._candidate(
            other, {i.category for i in me.interests}, await self._relations(me.id)
        )

    @staticmethod
    def _candidate(
        u: "User",
        my_interests: set[str],
        relations: dict[uuid.UUID, tuple[Relation, uuid.UUID]],
        distance_km: float | None = None,
        my_rating: str | None = None,
    ) -> Candidate:
        rel, req_id = relations.get(u.id, ("none", None))
        theirs = [i.category for i in u.interests]
        return Candidate(
            user=u,
            relation=rel,
            request_id=req_id,
            common_interests=[c for c in theirs if c in my_interests],
            distance_km=distance_km,
            my_rating=my_rating,  # type: ignore[arg-type]
        )
