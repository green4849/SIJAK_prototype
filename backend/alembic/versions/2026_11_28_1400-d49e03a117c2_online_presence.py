"""A10 opt-in online presence

Revision ID: d49e03a117c2
Revises: c71370be1e60
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "d49e03a117c2"
down_revision: str | Sequence[str] | None = "c71370be1e60"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column(
            "show_online_status", sa.Boolean(), server_default=sa.text("false"), nullable=False
        ),
    )
    op.add_column("users", sa.Column("last_seen_at", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "last_seen_at")
    op.drop_column("users", "show_online_status")
