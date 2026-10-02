import uuid
from datetime import UTC, datetime
from typing import Literal

from pydantic import BaseModel, Field

from app.domains.auth.constants import INTERESTS, REGIONS
from app.domains.auth.service import age_on
from app.domains.friend.service import Candidate


class FriendCard(BaseModel):
    """친구 찾기 카드 (④) — 전화번호·생년월일 등 개인정보는 넣지 않는다"""

    user_id: uuid.UUID
    name: str
    age: int
    gender: Literal["M", "F"]
    intro: str
    region_name: str
    interests: list[str]  # 표시용 라벨
    common_interests: list[str]  # 나와 겹치는 관심사 라벨
    distance_km: float | None = Field(
        description="대략적인 거리(km, 0.5 단위). 어느 한쪽이라도 위치를 모르면 null"
    )
    relation: Literal["none", "sent", "received", "friends"]
    request_id: uuid.UUID | None

    @classmethod
    def of(cls, c: Candidate) -> "FriendCard":
        u = c.user
        return cls(
            user_id=u.id,
            name=u.name,
            age=age_on(u.birth_date, datetime.now(UTC).date()),
            gender=u.gender,  # type: ignore[arg-type]
            intro=u.intro,
            region_name=REGIONS.get(u.region_code, u.region_code),
            interests=[INTERESTS.get(i.category, i.category) for i in u.interests],
            common_interests=[INTERESTS.get(x, x) for x in c.common_interests],
            distance_km=c.distance_km,
            relation=c.relation,
            request_id=c.request_id,
        )


class FriendRequestCreate(BaseModel):
    to_user_id: uuid.UUID
