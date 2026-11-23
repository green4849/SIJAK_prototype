"""welfare 도메인: 가까운 복지시설 (C7) — 노인복지관·시니어센터·경로당, 프로그램, 모임 공간.

- 시설 원본은 공공데이터포털 '노인복지시설' (scripts/import_welfare, 키 필요).
  키가 없을 때는 scripts/seed 의 **예시 시설**(`source='sample'`, 가명)만 들어간다
  → 화면에 '예시 정보' 안내가 붙는다 (`sample_note`).
- 위치는 위도·경도 두 칸 + 인덱스. 반경 검색은 사각형으로 먼저 거르고
  대원거리로 정확히 잰다 (repository·service).
  운영 DB(PostGIS 이미지)로 커지면 geography 칸 + ST_DWithin 으로 바꾼다 — repository 안만 바뀐다.
"""

import uuid
from datetime import datetime

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

KINDS = {"welfare_center": "노인복지관", "senior_center": "시니어센터", "kyungrodang": "경로당"}
# sample: 시드 예시(가명) / public_data: 공공데이터포털에서 가져옴
SOURCES = ("sample", "public_data")


class WelfareCenter(Base):
    __tablename__ = "welfare_centers"
    __table_args__ = (
        CheckConstraint(f"kind IN {tuple(KINDS)}", name="kind"),
        CheckConstraint(f"source IN {SOURCES}", name="source"),
        # 같은 원본 시설은 한 번만 (다시 가져오면 덮어 쓴다)
        UniqueConstraint("source", "source_id"),
        Index("ix_welfare_centers_lat_lng", "lat", "lng"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    source: Mapped[str] = mapped_column(String(20))
    source_id: Mapped[str] = mapped_column(String(64))
    name: Mapped[str] = mapped_column(String(100))
    kind: Mapped[str] = mapped_column(String(20))
    address: Mapped[str] = mapped_column(String(200))
    phone: Mapped[str] = mapped_column(String(20), default="", server_default="")
    region_code: Mapped[str] = mapped_column(String(10), index=True)
    lat: Mapped[float] = mapped_column(Float)
    lng: Mapped[float] = mapped_column(Float)
    # "평일 9시 ~ 18시, 토 9시 ~ 13시" — 화면이 읽어 '지금 열려 있어요'를 계산한다
    open_hours: Mapped[str] = mapped_column(String(100), default="", server_default="")
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    programs: Mapped[list["WelfareProgram"]] = relationship(
        cascade="all, delete-orphan", lazy="selectin", order_by="WelfareProgram.sort"
    )
    rooms: Mapped[list["WelfareRoom"]] = relationship(
        cascade="all, delete-orphan", lazy="selectin", order_by="WelfareRoom.sort"
    )


class WelfareProgram(Base):
    __tablename__ = "welfare_programs"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    center_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("welfare_centers.id", ondelete="CASCADE"), index=True
    )
    sort: Mapped[int] = mapped_column(Integer, default=0)
    title: Mapped[str] = mapped_column(String(60))
    schedule_text: Mapped[str] = mapped_column(String(60))
    fee_text: Mapped[str] = mapped_column(String(30), default="무료")
    # 남은 자리 (모르면 None)
    seats_left: Mapped[int | None] = mapped_column(Integer)


class WelfareRoom(Base):
    __tablename__ = "welfare_rooms"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    center_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("welfare_centers.id", ondelete="CASCADE"), index=True
    )
    sort: Mapped[int] = mapped_column(Integer, default=0)
    name: Mapped[str] = mapped_column(String(30))
    capacity: Mapped[int] = mapped_column(Integer)
    available_text: Mapped[str] = mapped_column(String(60))
