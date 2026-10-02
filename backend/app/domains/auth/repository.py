"""auth 도메인 DB 접근. SQLAlchemy 세션은 이 계층에서만 다룬다.

트랜잭션 경계(commit)는 service가 정한다 → repository는 flush까지만.
"""

import uuid
from datetime import UTC, datetime

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.auth.models import RefreshToken, User, UserInterest


class AuthRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    # ---- users ----

    async def get_user(self, user_id: uuid.UUID) -> User | None:
        return await self.session.get(User, user_id)

    async def get_user_by_ci(self, ci: str) -> User | None:
        return await self.session.scalar(select(User).where(User.pass_ci == ci))

    async def get_user_by_phone_hash(self, phone_hash: str) -> User | None:
        return await self.session.scalar(select(User).where(User.phone_hash == phone_hash))

    async def add_user(self, user: User, interests: list[str]) -> User:
        user.interests = [UserInterest(category=c) for c in interests]
        self.session.add(user)
        await self.session.flush()
        return user

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

    async def commit(self) -> None:
        await self.session.commit()
