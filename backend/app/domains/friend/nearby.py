"""같은 동네(반경) 검색 (C3, docs/deferred.md §1).

- 위치는 가입자가 동의한 경우에만, 소수점 2자리(≈1km 격자)로 뭉개서 저장되어 있다 (auth.service).
- 거리는 두 격자점 사이의 대원거리(haversine)이고, 다시 0.5km 단위로 반올림해 내보낸다.
  → 저장값 자체가 대략적이고, 여러 번 조회해 상대 위치를 역추적하기도 어렵게.
- 사용자가 늘면 PostGIS `ST_DWithin`(docker 이미지에 포함)으로 바꾼다 — 이 함수 안만 바뀐다.
"""

import math
from dataclasses import dataclass
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.domains.auth.models import User

DEFAULT_RADIUS_KM = 2.0
EARTH_RADIUS_KM = 6371.0088
DISTANCE_STEP_KM = 0.5


@dataclass(frozen=True)
class NearbyUser:
    user: "User"
    #: 대략적인 거리(km, 0.5 단위). 어느 한쪽이라도 위치가 없으면 None
    distance_km: float | None


def haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp, dl = p2 - p1, math.radians(lng2 - lng1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * EARTH_RADIUS_KM * math.asin(math.sqrt(a))


def _coarse(km: float) -> float:
    """0.5km 단위 반올림 (0은 0.5로 — '같은 곳'으로 보이지 않게)"""
    return max(DISTANCE_STEP_KM, round(km / DISTANCE_STEP_KM) * DISTANCE_STEP_KM)


def find_nearby(
    me: "User", candidates: list["User"], radius_km: float = DEFAULT_RADIUS_KM
) -> list[NearbyUser]:
    """'같은 동네' 탭 목록.

    - 내 위치가 없으면: 같은 시·도 사용자 (거리 없음) — 화면은 위치 동의 카드를 함께 보여 준다
    - 내 위치가 있으면: 반경 안의 사용자를 가까운 순으로,
      그 뒤에 위치를 안 알린 같은 시·도 사용자(거리 없음)
    """
    same_region = [u for u in candidates if u.region_code == me.region_code]
    if me.geo_lat is None or me.geo_lng is None:
        return [NearbyUser(u, None) for u in same_region]

    within: list[NearbyUser] = []
    for u in candidates:
        if u.geo_lat is None or u.geo_lng is None:
            continue
        km = haversine_km(me.geo_lat, me.geo_lng, u.geo_lat, u.geo_lng)
        if km <= radius_km:
            within.append(NearbyUser(u, _coarse(km)))
    within.sort(key=lambda n: n.distance_km or 0)

    unknown = [NearbyUser(u, None) for u in same_region if u.geo_lat is None]
    return within + unknown
