"""가까운 복지시설 (C7). 신청은 전화로만 — 서버는 찾기·보여 주기만 한다."""

import uuid
from dataclasses import dataclass
from typing import TYPE_CHECKING

from app.core.errors import NotFoundError
from app.core.geo import coarse_km, haversine_km
from app.domains.welfare.models import WelfareCenter
from app.domains.welfare.repository import WelfareRepository
from app.integrations.public_data.base import FacilityRecord

if TYPE_CHECKING:
    from app.domains.auth.models import User

# 데모 시설이 4.5km 까지 있어 복지관(시·군에 한두 곳)도 들어오게 5km
NEARBY_RADIUS_KM = 5.0
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


class WelfareService:
    def __init__(self, repo: WelfareRepository) -> None:
        self.repo = repo

    async def nearby(self, me: "User", kind: str | None) -> list[CenterView]:
        """내 위치가 있으면 반경 안을 가까운 순으로, 없으면 같은 시·도 시설(거리 없음)"""
        if me.geo_lat is None or me.geo_lng is None:
            found = await self.repo.in_region(me.region_code, kind, MAX_RESULTS)
            return [CenterView(c, None) for c in found]
        within: list[tuple[float, WelfareCenter]] = []
        for c in await self.repo.in_box(me.geo_lat, me.geo_lng, NEARBY_RADIUS_KM, kind):
            km = haversine_km(me.geo_lat, me.geo_lng, c.lat, c.lng)
            if km <= NEARBY_RADIUS_KM:
                within.append((km, c))
        within.sort(key=lambda x: (x[0], x[1].name))
        return [CenterView(c, coarse_km(km)) for km, c in within[:MAX_RESULTS]]

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
        for r in records:
            c = await self.repo.find_source("public_data", r.source_id)
            if c is None:
                c = WelfareCenter(source="public_data", source_id=r.source_id)
                self.repo.add(c)
                added += 1
            else:
                updated += 1
            c.name, c.kind, c.address, c.phone = r.name, r.kind, r.address, r.phone
            c.region_code, c.lat, c.lng, c.open_hours = r.region_code, r.lat, r.lng, r.open_hours
        await self.repo.commit()
        return added, updated
