"""DB 엔진·세션·Base. 세션은 repository 계층에서만 사용한다."""

from collections.abc import AsyncIterator

from sqlalchemy import MetaData
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.core.config import get_settings

# Alembic autogenerate가 제약조건 이름을 안정적으로 만들도록 규칙 고정
NAMING_CONVENTION = {
    "ix": "ix_%(column_0_label)s",
    "uq": "uq_%(table_name)s_%(column_0_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s",
}


class Base(DeclarativeBase):
    metadata = MetaData(naming_convention=NAMING_CONVENTION)


engine = create_async_engine(get_settings().database_url, pool_pre_ping=True)
SessionLocal = async_sessionmaker(engine, expire_on_commit=False)


def import_all_models() -> None:
    """모든 도메인의 models.py를 import해 Base.metadata에 등록 (Alembic·테스트용)."""
    import importlib
    import pkgutil

    import app.domains as domains

    for mod in pkgutil.iter_modules(domains.__path__):
        importlib.import_module(f"app.domains.{mod.name}.models")


async def get_session() -> AsyncIterator[AsyncSession]:
    async with SessionLocal() as session:
        yield session
