"""가까운 복지시설 (C7). 신청은 전화로만 — 서버는 찾기·보여 주기만 한다."""

import uuid
from dataclasses import dataclass
from typing import TYPE_CHECKING, Literal

from app.core.errors import NotFoundError
from app.core.geo import coarse_km, haversine_km
from app.domains.welfare.models import WelfareCenter
from app.domains.welfare.repository import WelfareRepository
from app.integrations.public_data.base import FacilityRecord

if TYPE_CHECKING:
    from app.domains.auth.models import User

# 처음엔 5km(걸어서·버스로 다닐 만한 거리). 없으면 넓혀 가며 찾는다 — 시설이 드문 곳에서
# 늘 빈 화면이 되지 않게. 20km 안에도 없으면 거리와 상관없이 가장 가까운 몇 곳을 거리와 함께.
NEARBY_RADIUS_KM = 5.0
SEARCH_RADII_KM = (5.0, 10.0, 20.0)
NEAREST_ANYWHERE = 5
MAX_RESULTS = 30
SAMPLE_NOTE = "예시로 넣은 시설이에요. 이름·프로그램·여는 시간·전화번호 모두 실제가 아니에요."


@dataclass(frozen=True)
class CenterView:
    center: WelfareCenter
    #: 대략적인 거리(km, 0.5 단위). 내 위치를 모르면 None
    distance_km: float | None

    @property
    def sample_note(self) -> str | None:
        return SAMPLE_NOTE if self.center.source == "sample" else None


def _distance(me: "User", c: WelfareCenter) -> float | None:
    if me.geo_lat is None or me.geo_lng is None:
        return None
    return haversine_km(me.geo_lat, me.geo_lng, c.lat, c.lng)


#: 무엇을 보여 주는지 — 화면 안내 문구를 고른다
#  near: 5km 안 · wider: 넓힌 반경 안 · nearest: 20km 밖이라 가장 가까운 곳
#  region: 위치를 몰라 같은 시·도
#  empty: 보여 줄 시설이 없음 (위치가 있으면 데이터 자체가 없고, 없으면 그 시·도에 없음)
SearchMode = Literal["near", "wider", "nearest", "region", "empty"]


@dataclass(frozen=True)
class SearchResult:
    mode: SearchMode
    #: near·wider 일 때 찾은 반경(km)
    radius_km: float | None
    centers: list[CenterView]


class WelfareService:
    def __init__(self, repo: WelfareRepository) -> None:
        self.repo = repo

    async def nearby(self, me: "User", kind: str | None) -> list[CenterView]:
        """search 의 시설 목록만 (예전 /welfare/nearby 응답 모양 그대로)"""
        return (await self.search(me, kind)).centers

    async def search(self, me: "User", kind: str | None) -> SearchResult:
        """가까운 시설.

        내 위치가 있으면 5km → 10km → 20km 로 넓혀 처음 찾은 반경 안을 가까운 순으로.
        20km 안에도 없으면 가장 가까운 몇 곳(거리 표시). 위치가 없으면 같은 시·도(거리 없음).
        """
        if me.geo_lat is None or me.geo_lng is None:
            found = await self.repo.in_region(me.region_code, kind, MAX_RESULTS)
            views = [CenterView(c, None) for c in found]
            return SearchResult("region" if views else "empty", None, views)

        lat, lng = me.geo_lat, me.geo_lng
        for radius in SEARCH_RADII_KM:
            within: list[tuple[float, WelfareCenter]] = []
            for c in await self.repo.in_box(lat, lng, radius, kind):
                km = haversine_km(lat, lng, c.lat, c.lng)
                if km <= radius:
                    within.append((km, c))
            if within:
                within.sort(key=lambda x: (x[0], x[1].name))
                views = [CenterView(c, coarse_km(km)) for km, c in within[:MAX_RESULTS]]
                mode: SearchMode = "near" if radius == SEARCH_RADII_KM[0] else "wider"
                return SearchResult(mode, radius, views)

        # 20km 안에도 없음 — 어디든 가장 가까운 곳 (DB 가 대략 거른 뒤 정확한 거리로 다시 정렬)
        candidates = await self.repo.nearest(lat, lng, kind, NEAREST_ANYWHERE * 4)
        ranked = sorted(
            ((haversine_km(lat, lng, c.lat, c.lng), c) for c in candidates),
            key=lambda x: (x[0], x[1].name),
        )[:NEAREST_ANYWHERE]
        views = [CenterView(c, coarse_km(km)) for km, c in ranked]
        return SearchResult("nearest" if views else "empty", None, views)

    async def detail(self, me: "User", center_id: str) -> CenterView:
        try:
            c = await self.repo.get(uuid.UUID(center_id))
        except ValueError:
            c = None
        if c is None:
            raise NotFoundError("없는 시설이에요.")
        km = _distance(me, c)
        return CenterView(c, None if km is None else coarse_km(km))

    # ---------- 가져오기 (scripts/import_welfare) ----------

    async def upsert_public(self, records: list[FacilityRecord]) -> tuple[int, int]:
        """공공데이터 시설을 넣거나 고친다 → (새로 넣은 수, 고친 수).

        시설 정보만 원본을 따른다. 프로그램·모임 공간은 원본에 없어 그대로 둔다.
        """
        added = updated = 0
        for start in range(0, len(records), 500):
            batch = records[start : start + 500]
            existing = await self.repo.find_sources("public_data", [r.source_id for r in batch])
            for r in batch:
                c = existing.get(r.source_id)
                if c is None:
                    c = WelfareCenter(source="public_data", source_id=r.source_id)
                    self.repo.add(c)
                    added += 1
                else:
                    updated += 1
                c.name, c.kind, c.address, c.phone = r.name, r.kind, r.address, r.phone
                c.region_code, c.lat, c.lng, c.open_hours = (
                    r.region_code,
                    r.lat,
                    r.lng,
                    r.open_hours,
                )
        await self.repo.commit()
        return added, updated
