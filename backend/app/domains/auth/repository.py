"""auth 도메인 DB 접근. SQLAlchemy 세션은 이 계층에서만 다룬다.

트랜잭션 경계(commit)는 service가 정한다 → repository는 flush까지만.
"""

import math
import uuid
from datetime import UTC, date, datetime

from sqlalchemy import and_, case, delete, func, or_, select, update
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.geo import bounding_box
from app.domains.auth.models import RefreshToken, User, UserInterest, WithdrawalReasonCount


class AuthRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    # ---- users ----

    async def get_user(self, user_id: uuid.UUID) -> User | None:
        return await self.session.get(User, user_id)

    async def list_active_users(
        self, *, region_code: str | None = None, exclude_ids: set[uuid.UUID] = frozenset()
    ) -> list[User]:
        q = select(User).where(User.status == "active")
        if region_code:
            q = q.where(User.region_code == region_code)
        if exclude_ids:
            q = q.where(User.id.not_in(exclude_ids))
        return list(await self.session.scalars(q.order_by(User.last_login_at.desc().nulls_last())))

    async def list_candidate_users(
        self,
        me: User,
        *,
        radius_km: float,
        exclude_ids: set[uuid.UUID],
        limit: int,
        nearest_first: bool,
    ) -> list[User]:
        """반경 사각형과 지역으로 먼저 거르고 최대 limit명만 읽는다."""
        q = select(User).where(User.status == "active")
        if exclude_ids:
            q = q.where(User.id.not_in(exclude_ids))
        if me.geo_lat is None or me.geo_lng is None:
            q = q.where(User.region_code == me.region_code)
            if me.area_name:
                q = q.order_by(case((User.area_name == me.area_name, 0), else_=1))
        else:
            min_lat, max_lat, min_lng, max_lng = bounding_box(me.geo_lat, me.geo_lng, radius_km)
            with_location = and_(
                User.geo_lat.between(min_lat, max_lat),
                User.geo_lng.between(min_lng, max_lng),
            )
            without_location = and_(
                User.region_code == me.region_code,
                or_(User.geo_lat.is_(None), User.geo_lng.is_(None)),
            )
            q = q.where(or_(with_location, without_location))
            if nearest_first:
                # 사각형 안의 후보만 대략 거리순으로 정렬한다. 정확한 반경과 거리는 friend가 계산.
                lat_delta = User.geo_lat - me.geo_lat
                lng_delta = (User.geo_lng - me.geo_lng) * max(
                    math.cos(math.radians(me.geo_lat)), 0.01
                )
                q = q.order_by((lat_delta * lat_delta + lng_delta * lng_delta).asc().nulls_last())
        q = q.order_by(func.coalesce(User.last_login_at, User.created_at).desc(), User.id)
        return list(await self.session.scalars(q.limit(limit)))

    async def get_users(self, ids: set[uuid.UUID]) -> list[User]:
        if not ids:
            return []
        return list(await self.session.scalars(select(User).where(User.id.in_(ids))))

    async def get_user_by_ci(self, ci: str) -> User | None:
        return await self.session.scalar(select(User).where(User.pass_ci == ci))

    async def get_user_by_kakao_id(self, kakao_id: str) -> User | None:
        return await self.session.scalar(select(User).where(User.kakao_id == kakao_id))

    async def get_user_by_phone_hash(self, phone_hash: str) -> User | None:
        return await self.session.scalar(select(User).where(User.phone_hash == phone_hash))

    async def add_user(self, user: User, interests: list[str]) -> User:
        user.interests = [UserInterest(category=c) for c in interests]
        self.session.add(user)
        await self.session.flush()
        return user

    async def set_interests(self, user: User, categories: list[str]) -> None:
        """차이만 반영 — 전부 지우고 다시 넣으면 (user_id, category) 유니크 제약과 충돌"""
        wanted = list(dict.fromkeys(categories))
        user.interests = [i for i in user.interests if i.category in wanted]
        have = {i.category for i in user.interests}
        user.interests.extend(UserInterest(category=c) for c in wanted if c not in have)
        await self.session.flush()

    async def set_ci(self, user: User, ci: str) -> None:
        user.pass_ci = ci
        await self.session.flush()

    async def touch_last_login(self, user: User) -> None:
        user.last_login_at = datetime.now(UTC)
        await self.session.flush()

    # ---- refresh tokens ----

    async def add_refresh_token(self, jti: str, user_id: uuid.UUID, expires_at: datetime) -> None:
        self.session.add(RefreshToken(jti=jti, user_id=user_id, expires_at=expires_at))
        await self.session.flush()

    async def get_refresh_token(self, jti: str) -> RefreshToken | None:
        return await self.session.get(RefreshToken, jti)

    async def revoke_refresh_token(self, jti: str) -> None:
        await self.session.execute(
            update(RefreshToken)
            .where(RefreshToken.jti == jti, RefreshToken.revoked_at.is_(None))
            .values(revoked_at=datetime.now(UTC))
        )

    async def revoke_all_refresh_tokens(self, user_id: uuid.UUID) -> None:
        await self.session.execute(
            update(RefreshToken)
            .where(RefreshToken.user_id == user_id, RefreshToken.revoked_at.is_(None))
            .values(revoked_at=datetime.now(UTC))
        )

    async def withdraw(
        self, user: User, at: datetime, delete_after: date, reason: str | None
    ) -> None:
        user.status = "deleted"
        user.withdrawn_at = at
        user.delete_after = delete_after
        user.withdraw_reason = reason
        await self.revoke_all_refresh_tokens(user.id)
        await self.session.flush()

    async def set_status(
        self, user: User, status: str, suspended_until: datetime | None = None
    ) -> None:
        user.status = status
        user.suspended_until = suspended_until
        await self.session.flush()

    # ---------- 탈퇴 정리 (B3 예약 작업) ----------

    async def withdrawn_due(self, today: date) -> list[User]:
        q = select(User).where(
            User.status == "deleted", User.delete_after.is_not(None), User.delete_after <= today
        )
        return list(await self.session.scalars(q))

    async def count_withdraw_reason(self, month: date, reason: str) -> None:
        await self.session.execute(
            insert(WithdrawalReasonCount)
            .values(month=month, reason=reason, count=1)
            .on_conflict_do_update(
                index_elements=["month", "reason"],
                set_={"count": WithdrawalReasonCount.count + 1},
            )
        )

    async def delete_user(self, user_id: uuid.UUID) -> None:
        """행째 지운다 — 다른 테이블은 외래키 ON DELETE 로 함께 지워진다"""
        await self.session.execute(delete(User).where(User.id == user_id))

    async def commit(self) -> None:
        await self.session.commit()
