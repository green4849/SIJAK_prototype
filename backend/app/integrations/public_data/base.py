"""공공데이터 연동 인터페이스 (C7). 서비스·스크립트는 구현체가 아니라 이 모양에 의존한다."""

from dataclasses import dataclass
from typing import Literal, Protocol

FacilityKind = Literal["welfare_center", "senior_center", "kyungrodang"]


@dataclass(frozen=True)
class FacilityRecord:
    """노인복지시설 한 곳 — 원본 형식을 우리 칸에 맞춘 값"""

    source_id: str  # 원본의 시설 고유값 (다시 가져올 때 같은 시설을 찾는 열쇠)
    name: str
    kind: FacilityKind
    address: str
    phone: str  # 숫자만
    region_code: str  # 시·도 2자리 (users.region_code 와 같은 체계)
    lat: float
    lng: float
    open_hours: str = ""


class PublicDataKeyMissing(RuntimeError):
    """공공데이터포털 인증키가 없음 — 사용자가 직접 발급해 환경 변수로 넣어야 한다"""


class WelfareFacilitySource(Protocol):
    async def fetch_facilities(self, region_code: str) -> list[FacilityRecord]:
        """시·도 하나의 노인복지시설 목록"""
        ...
