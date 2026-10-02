"""⑥⑦ 지역생활: 내 지역 목록·분류 → 상세 → 신청·정원·취소 → 관심 → 내 활동"""

from datetime import UTC, datetime, timedelta

from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.domains.activity.models import Activity
from tests.integration.helpers import signup_user


async def _seed(sm: async_sessionmaker[AsyncSession]) -> dict[str, str]:
    soon = datetime.now(UTC) + timedelta(days=3)
    rows = {
        "walk": Activity(
            title="건강 걷기",
            category="health",
            region_code="41",
            place="공원",
            schedule_text="화 10시",
            starts_at=soon,
            ends_at=soon + timedelta(hours=1),
            capacity=2,
        ),
        "movie": Activity(
            title="영화 상영",
            category="culture",
            region_code="41",
            place="회관",
            schedule_text="토 3시",
            starts_at=soon,
            ends_at=soon + timedelta(hours=2),
            capacity=10,
        ),
        "seoul": Activity(
            title="서울 모임",
            category="culture",
            region_code="11",
            place="도서관",
            schedule_text="금 2시",
            starts_at=soon,
            ends_at=soon + timedelta(hours=1),
            capacity=10,
        ),
        "past": Activity(
            title="지난 모임",
            category="health",
            region_code="41",
            place="공원",
            schedule_text="지난주",
            starts_at=soon - timedelta(days=10),
            ends_at=soon - timedelta(days=10),
            capacity=10,
        ),
    }
    async with sm() as s:
        s.add_all(rows.values())
        await s.commit()
        return {k: str(v.id) for k, v in rows.items()}


async def test_list_apply_capacity_like(client: AsyncClient, db_sessionmaker) -> None:  # noqa: ANN001
    ids = await _seed(db_sessionmaker)
    ha, _ = await signup_user(client, "김영희", region="41")
    hb, _ = await signup_user(client, "박철수", region="41")
    hc, _ = await signup_user(client, "이순자", region="41")

    # 내 지역(경기)의 지난 것 제외 목록, 분류 필터
    titles = [a["title"] for a in (await client.get("/api/v1/activities", headers=ha)).json()]
    assert set(titles) == {"건강 걷기", "영화 상영"}
    health = (await client.get("/api/v1/activities?category=health", headers=ha)).json()
    assert [a["title"] for a in health] == ["건강 걷기"]
    assert health[0]["category_label"] == "건강"

    # 신청 (정원 2)
    walk = ids["walk"]
    r = await client.post(f"/api/v1/activities/{walk}/application", headers=ha)
    assert r.status_code == 200 and r.json()["applied"] and r.json()["applied_count"] == 1
    again = await client.post(f"/api/v1/activities/{walk}/application", headers=ha)
    assert again.json()["applied_count"] == 1  # 중복 신청은 그대로
    await client.post(f"/api/v1/activities/{walk}/application", headers=hb)
    full = await client.post(f"/api/v1/activities/{walk}/application", headers=hc)
    assert full.status_code == 409 and full.json()["error"]["code"] == "activity_full"
    assert (await client.get(f"/api/v1/activities/{walk}", headers=hc)).json()["is_full"]

    # 취소하면 자리가 남
    c = await client.delete(f"/api/v1/activities/{walk}/application", headers=hb)
    assert not c.json()["applied"] and c.json()["applied_count"] == 1
    assert (
        await client.post(f"/api/v1/activities/{walk}/application", headers=hc)
    ).status_code == 200

    # 관심
    liked = await client.put(f"/api/v1/activities/{ids['movie']}/like", headers=ha)
    assert liked.json()["liked"]
    mine = (await client.get("/api/v1/activities/mine?kind=liked", headers=ha)).json()
    assert [a["title"] for a in mine] == ["영화 상영"]
    counts = (await client.get("/api/v1/activities/mine/counts", headers=ha)).json()
    assert counts == {"applied": 1, "liked": 1}

    # 지난 활동은 신청 불가
    past = await client.post(f"/api/v1/activities/{ids['past']}/application", headers=ha)
    assert past.status_code == 400 and past.json()["error"]["code"] == "activity_closed"


async def test_falls_back_to_all_regions(client: AsyncClient, db_sessionmaker) -> None:  # noqa: ANN001
    await _seed(db_sessionmaker)
    h, _ = await signup_user(client, "제주분", region="50")  # 활동 없는 지역
    titles = {a["title"] for a in (await client.get("/api/v1/activities", headers=h)).json()}
    assert {"건강 걷기", "서울 모임"} <= titles
