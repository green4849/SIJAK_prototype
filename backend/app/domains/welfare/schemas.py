import uuid
from typing import Literal

from pydantic import BaseModel, Field

from app.domains.welfare.models import KINDS
from app.domains.welfare.service import CenterView

WelfareKind = Literal["welfare_center", "senior_center", "kyungrodang"]  # models.KINDS


class WelfareProgramOut(BaseModel):
    id: uuid.UUID
    title: str
    schedule_text: str
    fee_text: str = Field(description="'무료' · '월 1만 원'")
    seats_left: int | None = Field(description="남은 자리 (모르면 null)")


class WelfareRoomOut(BaseModel):
    name: str
    capacity: int
    available_text: str = Field(description="'평일 오후 비어 있어요'")


class WelfareCenterOut(BaseModel):
    id: uuid.UUID
    name: str
    kind: WelfareKind
    kind_label: str
    address: str
    phone: str
    distance_km: float | None = Field(description="0.5km 단위. 내 위치를 모르면 null")
    open_hours: str
    programs: list[WelfareProgramOut]
    rooms: list[WelfareRoomOut] = Field(description="모임 공간 대여")
    sample_note: str | None = Field(
        description="예시·시연 데이터면 화면에 붙일 안내 (실제 공공데이터면 null)"
    )

    @classmethod
    def of(cls, v: CenterView) -> "WelfareCenterOut":
        c = v.center
        return cls(
            id=c.id,
            name=c.name,
            kind=c.kind,  # type: ignore[arg-type]
            kind_label=KINDS[c.kind],
            address=c.address,
            phone=c.phone,
            distance_km=v.distance_km,
            open_hours=c.open_hours,
            programs=[
                WelfareProgramOut(
                    id=p.id,
                    title=p.title,
                    schedule_text=p.schedule_text,
                    fee_text=p.fee_text,
                    seats_left=p.seats_left,
                )
                for p in c.programs
            ],
            rooms=[
                WelfareRoomOut(name=r.name, capacity=r.capacity, available_text=r.available_text)
                for r in c.rooms
            ],
            sample_note=v.sample_note,
        )
