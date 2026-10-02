"""FastAPI 공용 의존성. router에서만 사용한다."""

from typing import Annotated

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session

DbSession = Annotated[AsyncSession, Depends(get_session)]

# Stage 1에서 추가: CurrentUser = Annotated[User, Depends(get_current_user)]
