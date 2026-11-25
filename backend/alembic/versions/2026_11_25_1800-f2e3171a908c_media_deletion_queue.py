"""음성 삭제 재시도 목록

Revision ID: f2e3171a908c
Revises: e12a4b8c901d
"""

import sqlalchemy as sa

from alembic import op

revision = "f2e3171a908c"
down_revision = "e12a4b8c901d"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "pending_media_deletions",
        sa.Column("key", sa.String(64), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("key", name=op.f("pk_pending_media_deletions")),
    )


def downgrade() -> None:
    op.drop_table("pending_media_deletions")
