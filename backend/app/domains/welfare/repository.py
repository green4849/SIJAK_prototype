import math
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.geo import bounding_box
from app.domains.welfare.models import WelfareCenter


class WelfareRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get(self, center_id: uuid.UUID) -> WelfareCenter | None:
        return await self.session.get(WelfareCenter, center_id)

    async def in_box(
        self, lat: float, lng: float, radius_km: float, kind: str | None
    ) -> list[WelfareCenter]:
        """반경을 감싸는 사각형 안의 시설 (정확한 거리는 service 에서).

        TODO(PostGIS): 운영 DB 에서 geography 칸 + ST_DWithin 으로 — 이 메서드만 바꾼다.
        """
        min_lat, max_lat, min_lng, max_lng = bounding_box(lat, lng, radius_km)
        q = select(WelfareCenter).where(
            WelfareCenter.lat.between(min_lat, max_lat),
            WelfareCenter.lng.between(min_lng, max_lng),
        )
        if kind:
            q = q.where(WelfareCenter.kind == kind)
        return list(await self.session.scalars(q))

    async def nearest(
        self, lat: float, lng: float, kind: str | None, limit: int
    ) -> list[WelfareCenter]:
        """거리와 상관없이 가까운 순 후보 — 평면 근사(경도는 위도에 맞춰 줄임)로 DB 에서 정렬.

        정확한 거리는 service 가 haversine 으로 다시 계산·정렬한다 (후보를 넉넉히 받는다).
        """
        k = math.cos(math.radians(lat))
        dist2 = (WelfareCenter.lat - lat) * (WelfareCenter.lat - lat) + (
            (WelfareCenter.lng - lng) * k
        ) * ((WelfareCenter.lng - lng) * k)
        q = select(WelfareCenter)
        if kind:
            q = q.where(WelfareCenter.kind == kind)
        return list(await self.session.scalars(q.order_by(dist2, WelfareCenter.name).limit(limit)))

    async def in_region(
        self, region_code: str, kind: str | None, limit: int
    ) -> list[WelfareCenter]:
        q = select(WelfareCenter).where(WelfareCenter.region_code == region_code)
        if kind:
            q = q.where(WelfareCenter.kind == kind)
        return list(await self.session.scalars(q.order_by(WelfareCenter.name).limit(limit)))

    async def find_source(self, source: str, source_id: str) -> WelfareCenter | None:
        q = select(WelfareCenter).where(
            WelfareCenter.source == source, WelfareCenter.source_id == source_id
        )
        return await self.session.scalar(q)

    async def find_sources(self, source: str, source_ids: list[str]) -> dict[str, WelfareCenter]:
        q = select(WelfareCenter).where(
            WelfareCenter.source == source, WelfareCenter.source_id.in_(source_ids)
        )
        return {center.source_id: center for center in await self.session.scalars(q)}

    def add(self, center: WelfareCenter) -> None:
        self.session.add(center)

    async def commit(self) -> None:
        await self.session.commit()
