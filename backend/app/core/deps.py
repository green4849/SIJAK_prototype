"""FastAPI 공용 의존성. router에서만 사용한다."""

from typing import Annotated

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session

DbSession = Annotated[AsyncSession, Depends(get_session)]

# 로그인 사용자 의존성은 auth 도메인 소유 → app.domains.auth.deps.CurrentUser
