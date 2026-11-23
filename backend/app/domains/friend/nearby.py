"""같은 동네(반경) 검색 (C3, docs/deferred.md §1).

- 위치는 가입자가 동의한 경우에만, 소수점 2자리(≈1km 격자)로 뭉개서 저장되어 있다 (auth.service).
- 거리는 두 격자점 사이의 대원거리(haversine)이고, 다시 0.5km 단위로 반올림해 내보낸다.
  → 저장값 자체가 대략적이고, 여러 번 조회해 상대 위치를 역추적하기도 어렵게.
- 사용자가 늘면 PostGIS `ST_DWithin`(docker 이미지에 포함)으로 바꾼다 — 이 함수 안만 바뀐다.
"""

from dataclasses import dataclass
from typing import TYPE_CHECKING

from app.core.geo import coarse_km as _coarse
from app.core.geo import haversine_km

if TYPE_CHECKING:
    from app.domains.auth.models import User

DEFAULT_RADIUS_KM = 2.0


@dataclass(frozen=True)
class NearbyUser:
    user: "User"
    #: 대략적인 거리(km, 0.5 단위). 어느 한쪽이라도 위치가 없으면 None
    distance_km: float | None


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
