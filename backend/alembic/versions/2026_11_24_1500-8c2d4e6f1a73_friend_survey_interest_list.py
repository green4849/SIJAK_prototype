"""friend survey + interest list (Q1)

Revision ID: 8c2d4e6f1a73
Revises: 5b1f0c3a9d21
Create Date: 2026-11-24 15:00:00.000000

- friend_surveys: 성향조사 Q2~Q8
- user_interests: 좋아하는 활동 13개 → 성향조사 Q1의 10개.
  노래·음악·TV·드라마 → 영화·공연, 바둑·뜨개질·종교·옛날이야기는 맞는 항목이 없어 지운다.
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "8c2d4e6f1a73"
down_revision: str | Sequence[str] | None = "5b1f0c3a9d21"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "friend_surveys",
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("purpose", sa.String(length=20), nullable=False),
        sa.Column("places", sa.JSON(), nullable=False),
        sa.Column("times", sa.JSON(), nullable=False),
        sa.Column("frequency", sa.String(length=20), nullable=False),
        sa.Column("talk_style", sa.String(length=20), nullable=False),
        sa.Column("want", sa.String(length=20), nullable=False),
        sa.Column("traits", sa.JSON(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name=op.f("fk_friend_surveys_user_id_users"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("user_id", name=op.f("pk_friend_surveys")),
    )
    # 노래·음악, TV·드라마 → 영화·공연 (이미 영화·공연이 있으면 겹치는 쪽을 지운다)
    op.execute(
        """
        DELETE FROM user_interests a USING user_interests b
        WHERE a.category IN ('music', 'tv') AND b.user_id = a.user_id
          AND (b.category = 'movies' OR (b.category IN ('music', 'tv') AND b.id < a.id))
        """
    )
    op.execute("UPDATE user_interests SET category = 'movies' WHERE category IN ('music', 'tv')")
    op.execute(
        "DELETE FROM user_interests WHERE category IN ('baduk', 'crafts', 'faith', 'memories')"
    )


def downgrade() -> None:
    # 지운 관심사는 되살릴 수 없다. 새 코드만 정리한다
    op.execute("DELETE FROM user_interests WHERE category IN ('finance', 'volunteer')")
    op.execute("UPDATE user_interests SET category = 'tv' WHERE category = 'movies'")
    op.drop_table("friend_surveys")
