"""같은 동네(반경) 검색 — ⚠️ 프로토타입에서는 비워 둔 자리. docs/deferred.md §1

여기만 채우면 API·프론트는 그대로 동작한다:
  - distance_km 를 채우면 프론트가 "약 1.2km" 로 표시
  - 반경 밖 사용자를 걸러내면 '같은 동네' 탭에 반영
"""

from dataclasses import dataclass
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.domains.auth.models import User

DEFAULT_RADIUS_KM = 2.0


@dataclass(frozen=True)
class NearbyUser:
    user: "User"
    distance_km: float | None


def find_nearby(
    me: "User", candidates: list["User"], radius_km: float = DEFAULT_RADIUS_KM
) -> list[NearbyUser]:
    """TODO(deferred): me.geo_lat/geo_lng 기준 radius_km 이내 사용자 + 거리 계산.

    현재: 좌표와 무관하게 같은 시·도 사용자를 거리 없이 반환.
    """
    return [NearbyUser(u, None) for u in candidates if u.region_code == me.region_code]
