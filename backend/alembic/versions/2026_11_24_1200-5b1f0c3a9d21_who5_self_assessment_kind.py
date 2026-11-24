"""WHO-5 self assessment kind

Revision ID: 5b1f0c3a9d21
Revises: fe218df23639
Create Date: 2026-11-24 12:00:00.000000

"""

from collections.abc import Sequence

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "5b1f0c3a9d21"
down_revision: str | Sequence[str] | None = "fe218df23639"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """자가평가 종류에 WHO-5 추가"""
    op.drop_constraint(op.f("ck_self_assessments_kind"), "self_assessments", type_="check")
    op.create_check_constraint(
        op.f("ck_self_assessments_kind"), "self_assessments", "kind IN ('phq9', 'gad7', 'who5')"
    )


def downgrade() -> None:
    op.execute("DELETE FROM self_assessments WHERE kind = 'who5'")
    op.drop_constraint(op.f("ck_self_assessments_kind"), "self_assessments", type_="check")
    op.create_check_constraint(
        op.f("ck_self_assessments_kind"), "self_assessments", "kind IN ('phq9', 'gad7')"
    )
