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
        "등산과 사진 찍기를 좋아합니다. 주말마다 가까운 산에 오르고, "
        "찍은 꽃 사진을 손주들에게 보내 주는 게 낙이에요. 천천히 같이 걸으실 분 환영해요!",
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


# (제목, 부제, 분류, 지역, 장소, 일정 문구, 며칠 뒤, 시작 시, 시간(분), 정원, 아이콘, 소개)
DEMO_ACTIVITIES = [
    (
        "건강 걷기 모임",
        "함께 걸으며 건강도 챙기고 좋은 이웃도 만나요!",
        "health",
        "41",
        "○○근린공원 (시작 광장)",
        "매주 화·목 오전 10시",
        3,
        10,
        90,
        20,
        "walk",
        "우리 동네를 함께 걸으며 건강도 챙기고 이웃과 이야기 나누는 시간입니다. "
        "편한 운동화와 물을 챙겨 오세요. 걷는 속도는 천천히 맞춰요.",
    ),
    (
        "스마트폰 활용 교육 (사진 보내기·영상통화 기초반)",  # 긴 제목·장소 확인용
        "사진 보내기부터 영상통화까지 차근차근",
        "learning",
        "41",
        "○○주민센터 2층 정보화 교육실 (엘리베이터 이용 가능)",
        "9월 15일 (월) 오후 2시",
        5,
        14,
        120,
        12,
        "phone",
        "카카오톡 사진 보내기, 영상통화, 버스 도착 시간 보기를 배워요. 휴대폰을 꼭 챙겨 오세요.",
    ),
    (
        "동네 영화 상영회",
        "추억의 명작 영화를 함께 봐요",
        "culture",
        "41",
        "○○문화회관 소극장",
        "토요일 오후 3시",
        8,
        15,
        150,
        40,
        "movie",
        "옛날 명작 영화를 큰 화면으로 함께 봐요. 상영 후 차 한 잔 하며 이야기 나눠요.",
    ),
    (
        "전통 차 모임",
        "향긋한 차와 함께하는 담소",
        "culture",
        "41",
        "○○복지관 1층 사랑방",
        "목요일 오전 10시",
        11,
        10,
        90,
        15,
        "tea",
        "제철 전통차를 우려 마시며 이웃과 이야기 나누는 시간이에요.",
    ),
    (
        "노래 교실",
        "흘러간 옛 노래 함께 불러요",
        "culture",
        "41",
        "○○복지관 강당",
        "매주 수요일 오후 2시",
        2,
        14,
        90,
        30,
        "music",
        "트로트와 가곡을 함께 불러요. 목 풀기 체조로 시작해요.",
    ),
    (
        "의자 요가",
        "앉아서 하는 쉬운 스트레칭",
        "health",
        "41",
        "○○경로당",
        "매주 월요일 오전 11시",
        4,
        11,
        60,
        12,
        "exercise",
        "무릎이 불편하셔도 괜찮아요. 의자에 앉아서 천천히 몸을 풀어요.",
    ),
    (
        "텃밭 가꾸기",
        "상자 텃밭에 상추를 심어요",
        "learning",
        "11",
        "○○구민 공동텃밭",
        "토요일 오전 9시",
        6,
        9,
        120,
        15,
        "garden",
        "흙을 만지며 상추와 깻잎을 심어요. 장갑은 준비해 드려요.",
    ),
    (
        "그림책 읽기 모임",
        "손주에게 읽어 줄 그림책을 함께",
        "learning",
        "11",
        "○○구립도서관",
        "금요일 오후 2시",
        9,
        14,
        90,
        10,
        "book",
        "손주에게 읽어 주기 좋은 그림책을 함께 읽고 이야기 나눠요.",
    ),
]


async def seed_activities() -> None:
    from datetime import UTC, datetime, timedelta

    from sqlalchemy import func, select

    from app.domains.activity.models import Activity

    async with SessionLocal() as session:
        if await session.scalar(select(func.count()).select_from(Activity)):
            print("activities: 이미 있음 — 건너뜀")
            return
        today = datetime.now(UTC).replace(hour=0, minute=0, second=0, microsecond=0)
        for (
            title,
            sub,
            cat,
            region,
            place,
            _sched_hint,  # 참고용 원래 문구 — 실제 표시는 날짜로 생성
            days,
            hour,
            mins,
            cap,
            icon,
            desc,
        ) in DEMO_ACTIVITIES:
            # 한국 시각 hour시 → UTC
            start = today + timedelta(days=days, hours=hour - 9)
            # 목록 문구는 실제 날짜로 만든다 (고정 문구는 날짜와 어긋남)
            local = start + timedelta(hours=9)
            ampm = "오전" if local.hour < 12 else "오후"
            sched = (
                f"{local.month}월 {local.day}일 ({'월화수목금토일'[local.weekday()]}) "
                f"{ampm} {local.hour % 12 or 12}시" + (f" {local.minute}분" if local.minute else "")
            )
            session.add(
                Activity(
                    title=title,
                    subtitle=sub,
                    category=cat,
                    region_code=region,
                    place=place,
                    schedule_text=sched,
                    starts_at=start,
                    ends_at=start + timedelta(minutes=mins),
                    capacity=cap,
                    description=desc,
                    image_kind=icon,
                )
            )
        await session.commit()
        print(f"activities: +{len(DEMO_ACTIVITIES)}")


async def main() -> None:
    await seed_users()
    await seed_activities()


if __name__ == "__main__":
    asyncio.run(main())
