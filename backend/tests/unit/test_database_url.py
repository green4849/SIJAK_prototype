"""호스팅 DB 주소를 그대로 붙여 넣어도 asyncpg 로 연결되게 바꾸는지 (Render·Neon 배포)."""

import pytest
from sqlalchemy.dialects.postgresql.asyncpg import dialect
from sqlalchemy.engine import make_url

from app.core.config import Settings, to_asyncpg_url

NEON = "postgresql://app:pw123@ep-cool-1234.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"


@pytest.mark.parametrize(
    ("given", "expected"),
    [
        (
            NEON,
            "postgresql+asyncpg://app:pw123@ep-cool-1234.ap-southeast-1.aws.neon.tech/neondb?ssl=require",
        ),
        ("postgres://u:p@db:5432/x", "postgresql+asyncpg://u:p@db:5432/x"),
        (
            "postgresql+asyncpg://wipi:wipi@localhost:5432/wipi",
            "postgresql+asyncpg://wipi:wipi@localhost:5432/wipi",
        ),
        ("postgresql+asyncpg://u:p@h/d?ssl=require", "postgresql+asyncpg://u:p@h/d?ssl=require"),
        # 다른 드라이버를 적었으면 그대로
        (
            "postgresql+psycopg://u:p@h/d?sslmode=require",
            "postgresql+psycopg://u:p@h/d?sslmode=require",
        ),
    ],
)
def test_to_asyncpg_url(given: str, expected: str) -> None:
    assert to_asyncpg_url(given) == expected


def test_settings_apply_it() -> None:
    s = Settings(_env_file=None, database_url=NEON)  # type: ignore[call-arg]
    assert s.database_url.startswith("postgresql+asyncpg://")


def test_asyncpg_gets_only_known_arguments() -> None:
    # sslmode·channel_binding 이 남으면 asyncpg.connect() 가 모르는 인자로 실패한다
    _, kwargs = dialect().create_connect_args(make_url(to_asyncpg_url(NEON)))
    assert kwargs["ssl"] == "require"
    assert "sslmode" not in kwargs and "channel_binding" not in kwargs
