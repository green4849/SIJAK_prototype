"""C7 가까운 복지시설: 반경 검색·거리 계산·종류 거르기·상세 · 예시 표시 · 공공데이터 덮어쓰기"""

from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.domains.welfare.models import WelfareCenter, WelfareProgram, WelfareRoom
from app.domains.welfare.repository import WelfareRepository
from app.domains.welfare.service import SAMPLE_NOTE, WelfareService
from app.integrations.public_data.base import FacilityRecord
from tests.integration.helpers import signup_user

API = "/api/v1"
HOME = (37.19, 127.02)  # 내 위치 (서버가 소수점 2자리로 뭉개 저장)


def _center(sid: str, name: str, kind: str, lat: float, lng: float, **kw: object) -> WelfareCenter:
    return WelfareCenter(
        source=kw.pop("source", "sample"),
        source_id=sid,
        name=name,
        kind=kind,
        address="경기도 예시시",
        phone=kw.pop("phone", ""),
        region_code=kw.pop("region", "41"),
        lat=lat,
        lng=lng,
        open_hours="매일 10시 ~ 17시",
        **kw,
    )


async def _seed(sm: async_sessionmaker[AsyncSession]) -> None:
    async with sm() as s:
        s.add_all(
            [
                # 약 0.3km
                _center(
                    "a",
                    "가까운 경로당 (예시)",
                    "kyungrodang",
                    37.1927,
                    127.0205,
                    programs=[
                        WelfareProgram(sort=1, title="의자 요가", schedule_text="월 11시"),
                        WelfareProgram(
                            sort=0, title="노래 교실", schedule_text="화 14시", seats_left=3
                        ),
                    ],
                    rooms=[WelfareRoom(sort=0, name="큰방", capacity=15, available_text="주말")],
                ),
                # 약 4km
                _center("b", "먼 복지관 (예시)", "welfare_center", 37.19, 127.065),
                # 약 1.5km
                _center("c", "중간 시니어클럽 (예시)", "senior_center", 37.2035, 127.02),
                # 반경(5km) 밖 — 약 7km
                _center("d", "아주 먼 경로당 (예시)", "kyungrodang", 37.253, 127.02),
                # 다른 시·도
                _center("e", "서울 경로당 (예시)", "kyungrodang", 37.57, 126.98, region="11"),
            ]
        )
        await s.commit()


async def _set_location(client: AsyncClient, h: dict) -> None:
    r = await client.put(f"{API}/me/location", headers=h, json={"lat": HOME[0], "lng": HOME[1]})
    assert r.status_code == 200, r.text


async def test_nearby_by_distance(
    client: AsyncClient, db_sessionmaker: async_sessionmaker[AsyncSession]
) -> None:
    await _seed(db_sessionmaker)
    h, _ = await signup_user(client, "김영희")
    await _set_location(client, h)

    out = (await client.get(f"{API}/welfare/nearby", headers=h)).json()
    assert [(c["name"], c["distance_km"]) for c in out] == [
        ("가까운 경로당 (예시)", 0.5),  # 0.3km → 0.5 단위
        ("중간 시니어클럽 (예시)", 1.5),
        ("먼 복지관 (예시)", 4.0),
    ]
    first = out[0]
    assert first["kind"] == "kyungrodang" and first["kind_label"] == "경로당"
    assert first["sample_note"] == SAMPLE_NOTE
    # 프로그램·모임 공간은 정해 둔 순서대로
    assert [p["title"] for p in first["programs"]] == ["노래 교실", "의자 요가"]
    assert first["programs"][0]["seats_left"] == 3 and first["programs"][0]["fee_text"] == "무료"
    assert first["rooms"] == [{"name": "큰방", "capacity": 15, "available_text": "주말"}]

    only = (await client.get(f"{API}/welfare/nearby?kind=welfare_center", headers=h)).json()
    assert [c["name"] for c in only] == ["먼 복지관 (예시)"]
    assert (await client.get(f"{API}/welfare/nearby?kind=all", headers=h)).json() == out
    assert (await client.get(f"{API}/welfare/nearby?kind=hospital", headers=h)).status_code == 422

    r = await client.get(f"{API}/welfare/{first['id']}", headers=h)
    assert r.status_code == 200 and r.json() == first


async def test_without_location_same_region(
    client: AsyncClient, db_sessionmaker: async_sessionmaker[AsyncSession]
) -> None:
    """위치를 안 알렸으면 같은 시·도 시설을 거리 없이 (반경 밖이어도)"""
    await _seed(db_sessionmaker)
    h, _ = await signup_user(client, "김영희", region="41")
    out = (await client.get(f"{API}/welfare/nearby", headers=h)).json()
    assert {c["name"] for c in out} == {
        "가까운 경로당 (예시)",
        "먼 복지관 (예시)",
        "중간 시니어클럽 (예시)",
        "아주 먼 경로당 (예시)",
    }
    assert all(c["distance_km"] is None for c in out)
    detail = (await client.get(f"{API}/welfare/{out[0]['id']}", headers=h)).json()
    assert detail["distance_km"] is None


async def test_detail_errors(client: AsyncClient) -> None:
    h, _ = await signup_user(client, "김영희")
    for bad in ("w-1", "00000000-0000-0000-0000-000000000000"):
        r = await client.get(f"{API}/welfare/{bad}", headers=h)
        assert r.status_code == 404 and r.json()["error"]["message"] == "없는 시설이에요."
    assert (await client.get(f"{API}/welfare/nearby")).status_code == 401


async def test_public_data_upsert(
    client: AsyncClient, db_sessionmaker: async_sessionmaker[AsyncSession]
) -> None:
    """가져오기 스크립트가 쓰는 덮어쓰기 — 같은 원본 시설은 한 번만, 예시 안내 없음"""
    rec = FacilityRecord(
        source_id="P-1",
        name="공공 경로당",
        kind="kyungrodang",
        address="경기도 어딘가",
        phone="0310000000",
        region_code="41",
        lat=37.191,
        lng=127.021,
        open_hours="평일 9시 ~ 18시",
    )
    async with db_sessionmaker() as s:
        service = WelfareService(WelfareRepository(s))
        assert await service.upsert_public([rec]) == (1, 0)
        moved = FacilityRecord(**{**rec.__dict__, "name": "공공 경로당 (새 이름)"})
        assert await service.upsert_public([moved]) == (0, 1)

    h, _ = await signup_user(client, "김영희")
    await _set_location(client, h)
    out = (await client.get(f"{API}/welfare/nearby", headers=h)).json()
    assert [(c["name"], c["sample_note"], c["phone"]) for c in out] == [
        ("공공 경로당 (새 이름)", None, "0310000000")
    ]


async def _locate(client: AsyncClient, h: dict, lat: float, lng: float) -> None:
    r = await client.put(f"{API}/me/location", headers=h, json={"lat": lat, "lng": lng})
    assert r.status_code == 200, r.text


async def test_search_widens_radius_then_nearest(
    client: AsyncClient, db_sessionmaker: async_sessionmaker[AsyncSession]
) -> None:
    """5km 안에 있으면 near, 없으면 10km·20km 로 넓히고, 그래도 없으면 가장 가까운 곳"""
    await _seed(db_sessionmaker)
    h, _ = await signup_user(client, "김영희")

    await _locate(client, h, *HOME)
    out = (await client.get(f"{API}/welfare/search", headers=h)).json()
    assert out["mode"] == "near" and out["radius_km"] == 5.0
    # 예전 목록 API 도 같은 시설
    assert [c["id"] for c in out["centers"]] == [
        c["id"] for c in (await client.get(f"{API}/welfare/nearby", headers=h)).json()
    ]

    # 동쪽으로 옮김 — 5km 안엔 없고 10km 안에 셋 (복지관 약 6km, 경로당·시니어클럽 약 10km)
    await _locate(client, h, 37.19, 127.13)
    out = (await client.get(f"{API}/welfare/search", headers=h)).json()
    assert out["mode"] == "wider" and out["radius_km"] == 10.0
    names = [c["name"] for c in out["centers"]]
    assert names[0] == "먼 복지관 (예시)" and "아주 먼 경로당 (예시)" not in names
    dists = [c["distance_km"] for c in out["centers"]]
    assert dists == sorted(dists) and all(5.0 < d <= 10.0 for d in dists)

    # 부산 — 20km 안에 하나도 없음 → 거리와 상관없이 가장 가까운 5곳, 거리 표시
    await _locate(client, h, 35.18, 129.07)
    out = (await client.get(f"{API}/welfare/search", headers=h)).json()
    assert out["mode"] == "nearest" and out["radius_km"] is None
    dists = [c["distance_km"] for c in out["centers"]]
    assert len(dists) == 5 and dists == sorted(dists) and dists[0] > 200
    assert out["centers"][-1]["name"] == "서울 경로당 (예시)"  # 부산에서 가장 먼 곳이 끝
    # 종류를 거르면 그 종류만
    only = (await client.get(f"{API}/welfare/search?kind=welfare_center", headers=h)).json()
    assert only["mode"] == "nearest" and [c["name"] for c in only["centers"]] == [
        "먼 복지관 (예시)"
    ]
    # 예전 목록 API 는 빈 목록 대신 같은 결과
    assert len((await client.get(f"{API}/welfare/nearby", headers=h)).json()) == 5


async def test_search_empty_and_region(
    client: AsyncClient, db_sessionmaker: async_sessionmaker[AsyncSession]
) -> None:
    h, _ = await signup_user(client, "김영희", region="41")
    # 시설 데이터가 하나도 없으면 — 위치가 있든 없든 empty
    out = (await client.get(f"{API}/welfare/search", headers=h)).json()
    assert out == {"mode": "empty", "radius_km": None, "centers": []}
    await _locate(client, h, *HOME)
    assert (await client.get(f"{API}/welfare/search", headers=h)).json()["mode"] == "empty"

    # 위치를 모르는 분: 같은 시·도에 있으면 region, 없으면 empty
    await _seed(db_sessionmaker)
    h2, _ = await signup_user(client, "박순자", region="41")
    out = (await client.get(f"{API}/welfare/search", headers=h2)).json()
    assert out["mode"] == "region" and len(out["centers"]) == 4
    h3, _ = await signup_user(client, "최말순", region="26")
    assert (await client.get(f"{API}/welfare/search", headers=h3)).json()["mode"] == "empty"
