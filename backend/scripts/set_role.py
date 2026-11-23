"""운영자 역할 주기·빼기 (B7 /admin). 화면·API 로는 역할을 바꿀 수 없다 — 서버에서만.

    cd backend && uv run python -m scripts.set_role 01012345678 operator
    cd backend && uv run python -m scripts.set_role 01012345678 member

전화번호는 가입할 때 인증한 번호 (저장된 검색용 해시로 찾는다).
"""

import asyncio
import sys

from sqlalchemy import select

from app.core.database import SessionLocal
from app.core.security import hash_phone
from app.domains.auth.models import USER_ROLES, User


async def set_role(phone: str, role: str) -> int:
    async with SessionLocal() as s:
        user = await s.scalar(select(User).where(User.phone_hash == hash_phone(phone)))
        if user is None:
            print("그 전화번호로 가입한 사람이 없어요.", file=sys.stderr)
            return 1
        user.role = role
        await s.commit()
        print(f"{user.name}님 → {role}")
        return 0


def main() -> int:
    if len(sys.argv) != 3 or sys.argv[2] not in USER_ROLES:
        print(
            f"사용법: python -m scripts.set_role <전화번호> <{'|'.join(USER_ROLES)}>",
            file=sys.stderr,
        )
        return 2
    return asyncio.run(set_role(sys.argv[1], sys.argv[2]))


if __name__ == "__main__":
    sys.exit(main())
