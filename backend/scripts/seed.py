"""시연용 데이터 (여러 번 실행해도 안전 — 이미 있으면 건너뜀).

    cd backend && uv run python -m scripts.seed

데모 계정은 Mock PASS와 같은 방식으로 CI를 만들기 때문에,
아래 이름·생년월일·전화번호로 휴대폰 인증하면 그 사람으로 로그인된다.
"""

import asyncio
from datetime import date

from app.core.database import SessionLocal
from app.core.security import encrypt, hash_phone
from app.domains.auth.models import User
from app.domains.auth.repository import AuthRepository
from app.integrations.identity.base import IdentityRequest
from app.integrations.identity.mock_pass import MockPassProvider

# (이름, 생년월일, 전화, 성별, 시·도, 소개, 관심사, 대략 좌표)
DEMO_USERS = [
    (
        "이순자",
        "1958-05-02",
        "01020000001",
        "F",
        "41",
        "산책과 영화, 여행을 좋아해요. 같이 이야기 나눠요!",
        ["walking", "tv", "travel"],
        (37.27, 127.01),
    ),
    (
        "박정호",
        "1954-11-20",
        "01020000002",
        "M",
        "41",
        "매일 아침 한강 걷기를 해요. 좋은 친구를 만나고 싶어요.",
        ["walking", "health", "baduk"],
        (37.28, 127.02),
    ),
    (
        "김영희",
        "1956-02-14",
        "01020000003",
        "F",
        "41",
        "요리와 텃밭 가꾸기를 좋아해요.",
        ["cooking", "gardening"],
        (37.26, 127.00),
    ),
    (
        "최말순",
        "1952-08-08",
        "01020000004",
        "F",
        "41",
        "옛날 노래 들으며 뜨개질해요.",
        ["music", "crafts", "memories"],
        None,
    ),
    (
        "정덕수",
        "1950-03-30",
        "01020000005",
        "M",
        "41",
        "바둑 두실 분 찾아요.",
        ["baduk", "reading"],
        (37.29, 127.03),
    ),
    (
        "한옥자",
        "1957-12-01",
        "01020000006",
        "F",
        "11",
        "복지관 노래교실 다녀요.",
        ["music", "health"],
        (37.57, 126.98),
    ),
    (
        "윤기철",
        "1953-06-17",
        "01020000007",
        "M",
        "11",
        "등산과 사진 찍기를 좋아합니다.",
        ["walking", "travel"],
        None,
    ),
]


async def seed_users() -> None:
    async with SessionLocal() as session:
        repo = AuthRepository(session)
        added = 0
        for name, birth, phone, gender, region, intro, interests, geo in DEMO_USERS:
            ci = MockPassProvider._make_ci(
                IdentityRequest(
                    name=name, birth_date=date.fromisoformat(birth), phone=phone, gender=gender
                )  # type: ignore[arg-type]
            )
            if await repo.get_user_by_ci(ci):
                continue
            user = User(
                name=name,
                birth_date=date.fromisoformat(birth),
                gender=gender,
                phone_hash=hash_phone(phone),
                phone_enc=encrypt(phone),
                pass_ci=ci,
                region_code=region,
                intro=intro,
                geo_lat=geo[0] if geo else None,
                geo_lng=geo[1] if geo else None,
            )
            await repo.add_user(user, interests)
            added += 1
        await repo.commit()
        print(f"users: +{added} (총 {len(DEMO_USERS)}명 중)")


async def main() -> None:
    await seed_users()


if __name__ == "__main__":
    asyncio.run(main())
