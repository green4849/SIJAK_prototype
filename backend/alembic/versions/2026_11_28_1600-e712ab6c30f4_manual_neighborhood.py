"""Store a neighborhood name when GPS is unavailable.

Revision ID: e712ab6c30f4
Revises: d49e03a117c2
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "e712ab6c30f4"
down_revision: str | Sequence[str] | None = "d49e03a117c2"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("users", sa.Column("area_name", sa.String(length=50), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "area_name")
