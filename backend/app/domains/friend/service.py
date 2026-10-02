"""친구 찾기·신청 (④). 사용자 정보는 AuthService(공개 메서드)로만 얻는다."""

import uuid
from dataclasses import dataclass
from typing import TYPE_CHECKING, Literal

from app.core.errors import ConflictError, DomainError, ForbiddenError, NotFoundError
from app.domains.auth.service import AuthService
from app.domains.friend.models import FriendRequest
from app.domains.friend.nearby import find_nearby
from app.domains.friend.repository import FriendRepository

if TYPE_CHECKING:
    from app.domains.auth.models import User

Relation = Literal["none", "sent", "received", "friends"]
Tab = Literal["recommended", "nearby"]
MAX_RESULTS = 30


@dataclass(frozen=True)
class Candidate:
    user: "User"
    relation: Relation
    request_id: uuid.UUID | None
    common_interests: list[str]
    distance_km: float | None = None


class CannotRequestSelfError(DomainError):
    code = "cannot_request_self"


class FriendService:
    def __init__(self, repo: FriendRepository, auth: AuthService) -> None:
        self.repo = repo
        self.auth = auth

    # ---------- 추천 ----------

    async def recommend(self, me: "User", tab: Tab) -> list[Candidate]:
        relations = await self._relations(me.id)
        # 이미 친구인 사람은 추천에서 뺀다 (친구 목록에서 따로 보여 줌)
        exclude = {me.id} | {uid for uid, (rel, _) in relations.items() if rel == "friends"}
        exclude |= await self._blocked_ids(me.id)
        my_interests = {i.category for i in me.interests}

        if tab == "nearby":
            pool = await self.auth.list_active_users(exclude_ids=exclude)
            found = find_nearby(me, pool)
            pairs = [(n.user, n.distance_km) for n in found]
            # 거리가 있으면 가까운 순, 없으면 최근 접속 순(조회 순서 유지)
            pairs.sort(key=lambda p: (p[1] is None, p[1] or 0))
        else:
            pool = await self.auth.list_active_users(exclude_ids=exclude)
            pairs = [(u, None) for u in pool]
            # 관심사 많이 겹치는 순, 같은 지역 우선
            pairs.sort(
                key=lambda p: (
                    -len(my_interests & {i.category for i in p[0].interests}),
                    p[0].region_code != me.region_code,
                )
            )

        return [
            self._candidate(u, my_interests, relations, distance)
            for u, distance in pairs[:MAX_RESULTS]
        ]

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
        """차단 관계 (Stage 5 risk 도메인에서 채움)"""
        return set()

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
    ) -> Candidate:
        rel, req_id = relations.get(u.id, ("none", None))
        theirs = [i.category for i in u.interests]
        return Candidate(
            user=u,
            relation=rel,
            request_id=req_id,
            common_interests=[c for c in theirs if c in my_interests],
            distance_km=distance_km,
        )
