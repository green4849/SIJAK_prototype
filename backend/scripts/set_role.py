"""운영자 역할 주기·빼기 (B7 /admin). 화면·API 로는 역할을 바꿀 수 없다 — 서버에서만.

    cd backend && uv run python -m scripts.set_role --user-id <회원 UUID> operator
    cd backend && uv run python -m scripts.set_role --kakao-id <카카오 회원번호> operator
    cd backend && uv run python -m scripts.set_role 01012345678 member

전화번호는 기존 전화 가입 회원만 쓸 수 있다. 카카오 회원은 회원 UUID 또는 카카오 회원번호로 찾는다.
이 스크립트는 DB 에 직접 연결한다. 운영 DB 에 대해서는 접근 승인 후에만 실행한다.
"""

import asyncio
import sys
import uuid

from sqlalchemy import select

from app.core.database import SessionLocal
from app.core.security import hash_phone
from app.domains.auth.models import USER_ROLES, User


async def set_role(identifier: str, role: str, *, by: str = "phone") -> int:
    if by == "user-id":
        try:
            user_id = uuid.UUID(identifier)
        except ValueError:
            print("올바른 회원 UUID를 입력해 주세요.", file=sys.stderr)
            return 2
        criterion = User.id == user_id
    elif by == "kakao-id":
        if not identifier.isdecimal():
            print("카카오 회원번호는 숫자만 입력해 주세요.", file=sys.stderr)
            return 2
        criterion = User.kakao_id == identifier
    else:
        criterion = User.phone_hash == hash_phone(identifier)

    async with SessionLocal() as s:
        user = await s.scalar(select(User).where(criterion))
        if user is None:
            print("해당 회원을 찾을 수 없어요.", file=sys.stderr)
            return 1
        if user.status != "active":
            print("활성 회원에게만 역할을 지정할 수 있어요.", file=sys.stderr)
            return 1
        user.role = role
        await s.commit()
        print(f"{user.id} ({user.name}) → {role}")
        return 0


def main() -> int:
    args = sys.argv[1:]
    if len(args) == 2:
        by = "phone"
        identifier, role = args
    elif len(args) == 3 and args[0] in {"--user-id", "--kakao-id"}:
        by = args[0][2:]
        identifier, role = args[1:]
    else:
        by = ""
        identifier = role = ""
    if not by or role not in USER_ROLES:
        print(
            "사용법: python -m scripts.set_role "
            "[--user-id <회원 UUID>|--kakao-id <카카오 회원번호>|<전화번호>] "
            f"<{'|'.join(USER_ROLES)}>",
            file=sys.stderr,
        )
        return 2
    return asyncio.run(set_role(identifier, role, by=by))


if __name__ == "__main__":
    sys.exit(main())
