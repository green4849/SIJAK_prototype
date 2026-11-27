"""카카오 로그인 회원번호와 전화번호 없는 계정 허용.

Revision ID: a1b2c3d4e5f6
Revises: f2e3171a908c
"""

from alembic import op
import sqlalchemy as sa

revision = "a1b2c3d4e5f6"
down_revision = "f2e3171a908c"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("kakao_id", sa.String(length=64), nullable=True))
    op.create_unique_constraint("uq_users_kakao_id", "users", ["kakao_id"])
    op.alter_column("users", "phone_hash", existing_type=sa.String(length=64), nullable=True)
    op.alter_column("users", "phone_enc", existing_type=sa.LargeBinary(), nullable=True)
    op.alter_column("users", "pass_ci", existing_type=sa.String(length=88), nullable=True)


def downgrade() -> None:
    bind = op.get_bind()
    if bind.execute(sa.text("SELECT 1 FROM users WHERE kakao_id IS NOT NULL LIMIT 1")).first():
        raise RuntimeError("카카오 계정이 있으면 이 마이그레이션을 되돌릴 수 없습니다.")
    op.alter_column("users", "pass_ci", existing_type=sa.String(length=88), nullable=False)
    op.alter_column("users", "phone_enc", existing_type=sa.LargeBinary(), nullable=False)
    op.alter_column("users", "phone_hash", existing_type=sa.String(length=64), nullable=False)
    op.drop_constraint("uq_users_kakao_id", "users", type_="unique")
    op.drop_column("users", "kakao_id")
