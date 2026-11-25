"""b8 candidate lookup indexes

Revision ID: e12a4b8c901d
Revises: 07fe1421573c
Create Date: 2026-11-25 15:30:00

"""

from collections.abc import Sequence

from alembic import op

revision: str = "e12a4b8c901d"
down_revision: str | Sequence[str] | None = "07fe1421573c"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_index("ix_users_status_region_code", "users", ["status", "region_code"], unique=False)
    op.create_index(
        "ix_users_status_geo_lat_geo_lng",
        "users",
        ["status", "geo_lat", "geo_lng"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_users_status_geo_lat_geo_lng", table_name="users")
    op.drop_index("ix_users_status_region_code", table_name="users")
