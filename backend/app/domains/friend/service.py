"""친구 찾기·신청 (④), 성향조사와 추천 적합도. 사용자 정보는 AuthService(공개 메서드)로만 얻는다."""

import uuid
from dataclasses import dataclass
from typing import TYPE_CHECKING, Literal

from app.core.errors import ConflictError, DomainError, ForbiddenError, NotFoundError
from app.domains.auth.constants import INTERESTS
from app.domains.auth.service import AuthService
from app.domains.friend.models import FriendRequest
from app.domains.friend.nearby import (
    DEFAULT_RADIUS_KM,
    RECOMMEND_RADIUS_KM,
    find_nearby,
    within_reach,
)
from app.domains.friend.repository import FriendRepository
from app.domains.friend.survey import Answers, Match, match, validate
from app.domains.notification.service import NotificationService
from app.domains.point.service import PointService
from app.domains.risk.service import RiskService

if TYPE_CHECKING:
    from app.domains.auth.models import User

Relation = Literal["none", "sent", "received", "friends"]
Tab = Literal["recommended", "nearby"]
Rating = Literal["like", "neutral", "dislike"]
MAX_RESULTS = 30
# 반경·지역으로 거른 뒤에도 후보가 많은 곳에서는 최근 이용자만 점수 계산에 넣는다.
MAX_CANDIDATES = 500
# 평가 반영 (C12): 추천 탭에서 '이런 분 더 보여 주세요' 먼저, 평가 안 한 사람, '그저 그래요' 순.
# '잘 안 맞아요'는 추천 탭에서 다시 보이지 않는다 (같은 동네 탭은 거리 목록이라 그대로)
_RATING_ORDER = {"like": 0, None: 1, "neutral": 2}


@dataclass(frozen=True)
class Candidate:
    user: "User"
    relation: Relation
    request_id: uuid.UUID | None
    common_interests: list[str]
    distance_km: float | None = None
    my_rating: Rating | None = None
    #: 추천 탭만 — 적합도를 말로 ('잘 맞아요') + 이유. 점수 숫자는 순서에만 쓴다
    match_label: str | None = None
    reasons: list[str] | None = None


@dataclass(frozen=True)
class RatingResult:
    rating: Rating
    points_earned: int
    ratings_left_today: int


class CannotRequestSelfError(DomainError):
    code = "cannot_request_self"


class InvalidSurveyError(DomainError):
    status_code = 422
    code = "validation_error"


class FriendService:
    def __init__(
        self,
        repo: FriendRepository,
        auth: AuthService,
        risk: RiskService,
        points: PointService,
        notifications: NotificationService,
    ) -> None:
        self.repo = repo
        self.auth = auth
        self.risk = risk
        self.points = points
        self.notifications = notifications

    # ---------- 추천 ----------

    async def recommend(self, me: "User", tab: Tab, q: str = "") -> list[Candidate]:
        relations = await self._relations(me.id)
        # 이미 친구인 사람은 추천에서 뺀다 (친구 목록에서 따로 보여 줌)
        exclude = {me.id} | {uid for uid, (rel, _) in relations.items() if rel == "friends"}
        exclude |= await self._blocked_ids(me.id)
        my_interests = {i.category for i in me.interests}
        ratings = await self.repo.ratings_by(me.id)

        if tab == "nearby":
            pool = await self.auth.list_candidate_users(
                me,
                radius_km=DEFAULT_RADIUS_KM,
                exclude_ids=exclude,
                limit=MAX_CANDIDATES,
                nearest_first=True,
            )
            found = find_nearby(me, [u for u in pool if self._matches_search(u, q)])
            pairs = [(n.user, n.distance_km) for n in found]
            # 거리가 있으면 가까운 순, 없으면 최근 접속 순(조회 순서 유지)
            pairs.sort(key=lambda p: (p[1] is None, p[1] or 0))
        else:
            return await self._recommend_by_match(me, exclude, relations, ratings, q)

        return [
            self._candidate(u, my_interests, relations, distance, ratings.get(u.id))
            for u, distance in pairs[:MAX_RESULTS]
        ]

    async def _recommend_by_match(
        self,
        me: "User",
        exclude: set[uuid.UUID],
        relations: dict[uuid.UUID, tuple[Relation, uuid.UUID]],
        ratings: dict[uuid.UUID, str],
        q: str = "",
    ) -> list[Candidate]:
        """추천 친구 탭 — 성향조사 알고리즘 (friend/survey.py).

        1단계 5km 안(위치 없으면 같은 시·도) → 2~4단계 적합도 → 5단계 높은 순.
        평가는 지금처럼: '잘 안 맞아요'는 빼고, '이런 분 더 보여 주세요' 한 분은 앞으로.
        같은 점수면 '더 보여 주세요' 한 분들의 관심사와 겹치는 분, 가까운 분 먼저.
        """
        disliked = {uid for uid, r in ratings.items() if r == "dislike"}
        pool = await self.auth.list_candidate_users(
            me,
            radius_km=RECOMMEND_RADIUS_KM,
            exclude_ids=exclude | disliked,
            limit=MAX_CANDIDATES,
        )
        reach = [n for n in within_reach(me, pool) if self._matches_search(n.user, q)]
        surveys = await self.repo.surveys_of({me.id} | {n.user.id for n in reach})
        mine = surveys.get(me.id)
        my_list = [i.category for i in me.interests]
        liked_interests = {
            i.category for n in reach if ratings.get(n.user.id) == "like" for i in n.user.interests
        }

        scored: list[tuple[Match, int, User, float | None]] = []
        for n in reach:
            theirs = [i.category for i in n.user.interests]
            m = match(my_list, theirs, mine, surveys.get(n.user.id))
            scored.append((m, len(liked_interests & set(theirs)), n.user, n.distance_km))
        scored.sort(
            key=lambda s: (
                _RATING_ORDER[ratings.get(s[2].id)],
                -s[0].score,
                -s[1],
                s[3] if s[3] is not None else float("inf"),
            )
        )
        my_interests = set(my_list)
        return [
            self._candidate(u, my_interests, relations, km, ratings.get(u.id), m)
            for m, _, u, km in scored[:MAX_RESULTS]
        ]

    # ---------- 성향조사 ----------

    async def survey(self, me: "User") -> Answers | None:
        return (await self.repo.surveys_of({me.id})).get(me.id)

    async def save_survey(self, me: "User", interests: list[str], answers: Answers) -> Answers:
        """Q1은 프로필 관심사로(가입 '좋아하는 것'과 같은 목록), Q2~Q8은 성향조사로 저장"""
        problem = validate(interests, answers)
        if problem:
            raise InvalidSurveyError(problem)
        await self.auth.update_profile(me, interests=list(dict.fromkeys(interests)))
        await self.repo.save_survey(me.id, answers)
        await self.repo.commit()
        return answers

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
                await self.notifications.on_became_friends(to_id, me.id, me.name)
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
        await self.notifications.on_friend_request(to_id, me.id, me.name)
        await self.repo.commit()
        return await self._candidate_for(me, target)

    async def respond(self, me: "User", request_id: uuid.UUID, accept: bool) -> FriendRequest:
        req = await self.repo.get(request_id)
        if req is None or req.to_user_id != me.id or req.status != "pending":
            raise NotFoundError("이미 처리됐거나 없는 신청이에요.")
        await self.repo.set_status(req, "accepted" if accept else "declined")
        if accept:
            await self.notifications.on_became_friends(req.from_user_id, me.id, me.name)
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
        # 탈퇴한 분은 친구·받은 신청 목록에서 바로 빠진다 (B3)
        return [
            self._candidate(u, mine, relations) for u in users.values() if u.status != "deleted"
        ]

    @staticmethod
    def _matches_search(user: "User", q: str) -> bool:
        needle = q.strip().casefold()
        return not needle or any(
            needle in value.casefold()
            for value in (
                user.name,
                user.intro,
                *(INTERESTS.get(i.category, i.category) for i in user.interests),
            )
        )

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
        m: Match | None = None,
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
            match_label=m.label if m else None,
            reasons=m.reasons if m else None,
        )
