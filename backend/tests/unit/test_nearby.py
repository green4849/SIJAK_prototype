"""C3 — 반경 검색: 거리 계산·반올림·정렬·위치 없는 사람 처리."""

from types import SimpleNamespace

import pytest

from app.domains.friend.nearby import _coarse, find_nearby, haversine_km


def user(name: str, lat: float | None, lng: float | None, region: str = "41") -> SimpleNamespace:
    return SimpleNamespace(name=name, geo_lat=lat, geo_lng=lng, region_code=region)


def test_haversine_known_distance() -> None:
    # 위도 0.01도 ≈ 1.11km
    assert haversine_km(37.27, 127.01, 37.28, 127.01) == pytest.approx(1.11, abs=0.01)


@pytest.mark.parametrize(
    ("km", "shown"), [(0.0, 0.5), (0.2, 0.5), (0.8, 1.0), (1.11, 1.0), (1.3, 1.5)]
)
def test_distance_is_coarse(km: float, shown: float) -> None:
    assert _coarse(km) == shown


def test_within_radius_sorted_then_unknown_same_region() -> None:
    me = user("나", 37.27, 127.01)
    near = user("가까운", 37.27, 127.02)  # ≈0.9km
    mid = user("중간", 37.28, 127.02)  # ≈1.4km
    far = user("먼", 37.30, 127.01)  # ≈3.3km
    unknown_same = user("모름-같은도", None, None)
    unknown_other = user("모름-다른도", None, None, region="11")

    got = find_nearby(me, [far, mid, unknown_same, near, unknown_other])  # type: ignore[arg-type]
    assert [(n.user.name, n.distance_km) for n in got] == [
        ("가까운", 1.0),
        ("중간", 1.5),
        ("모름-같은도", None),
    ]


def test_without_my_location_falls_back_to_same_region() -> None:
    me = user("나", None, None)
    pool = [user("같은도", 37.27, 127.01), user("다른도", 37.5, 127.0, region="11")]
    got = find_nearby(me, pool)  # type: ignore[arg-type]
    assert [(n.user.name, n.distance_km) for n in got] == [("같은도", None)]
