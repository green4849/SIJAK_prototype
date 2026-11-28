import asyncio
import os
import re
from logging.config import fileConfig

from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import async_engine_from_config

from alembic import context

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# Interpret the config file for Python logging.
# This line sets up loggers basically.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

from app.core.config import get_settings  # noqa: E402
from app.core.database import Base, import_all_models  # noqa: E402

# 모든 도메인의 models.py를 자동 import → autogenerate가 테이블을 빠짐없이 인식
import_all_models()

config.set_main_option("sqlalchemy.url", get_settings().database_url)
target_metadata = Base.metadata

# other values from the config, defined by the needs of env.py,
# can be acquired:
# my_important_option = config.get_main_option("my_important_option")
# ... etc.


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode.

    This configures the context with just a URL
    and not an Engine, though an Engine is acceptable
    here as well.  By skipping the Engine creation
    we don't even need a DBAPI to be available.

    Calls to context.execute() here emit the given string to the
    script output.

    """
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


# 잠금을 기다리다 배포가 멈추지 않게 — 기다릴 수 있는 최대 시간을 넘으면 실패하고 다음 배포에서 다시
# (운영 중인 서버가 users 같은 표를 쓰고 있으면 ALTER TABLE 이 잠금을 기다린다)
MIGRATION_LOCK_TIMEOUT = os.environ.get("MIGRATION_LOCK_TIMEOUT", "30s")
if not re.fullmatch(r"\d+(ms|s|min)?", MIGRATION_LOCK_TIMEOUT):
    raise ValueError("MIGRATION_LOCK_TIMEOUT 는 30s·500ms·2min 처럼")


def do_run_migrations(connection: Connection) -> None:
    if connection.dialect.name == "postgresql":
        connection.exec_driver_sql(f"SET lock_timeout = '{MIGRATION_LOCK_TIMEOUT}'")
        # SET 이 연 트랜잭션을 닫는다 — 열어 둔 채면 alembic 이 바깥 트랜잭션으로 보고 커밋하지 않는다.
        # SET 은 연결(세션) 단위라 커밋 뒤에도 유지된다
        connection.commit()
    context.configure(connection=connection, target_metadata=target_metadata)

    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    """In this scenario we need to create an Engine
    and associate a connection with the context.

    """

    connectable = async_engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)

    await connectable.dispose()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""

    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
