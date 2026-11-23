"""거리 계산 — 순수 함수만 (friend 같은 동네 검색, welfare 가까운 시설이 같이 쓴다)."""

import math

EARTH_RADIUS_KM = 6371.0088
DISTANCE_STEP_KM = 0.5
KM_PER_LAT_DEGREE = 111.32


def haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp, dl = p2 - p1, math.radians(lng2 - lng1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * EARTH_RADIUS_KM * math.asin(math.sqrt(a))


def coarse_km(km: float) -> float:
    """0.5km 단위 반올림 (0은 0.5로 — '같은 곳'으로 보이지 않게)"""
    return max(DISTANCE_STEP_KM, round(km / DISTANCE_STEP_KM) * DISTANCE_STEP_KM)


def bounding_box(lat: float, lng: float, radius_km: float) -> tuple[float, float, float, float]:
    """(min_lat, max_lat, min_lng, max_lng) — 반경 검색 전에 인덱스로 거르는 사각형"""
    dlat = radius_km / KM_PER_LAT_DEGREE
    dlng = radius_km / (KM_PER_LAT_DEGREE * max(math.cos(math.radians(lat)), 0.01))
    return lat - dlat, lat + dlat, lng - dlng, lng + dlng
