import uuid
from datetime import datetime

from pydantic import BaseModel, Field, field_validator

from app.core.security import normalize_phone
from app.domains.emergency.models import NAME_MAX_LEN, RELATION_MAX_LEN
from app.domains.emergency.service import GuardianView, SosResult


class GuardianIn(BaseModel):
    name: str = Field(max_length=NAME_MAX_LEN)
    relation: str = Field(max_length=RELATION_MAX_LEN)
    phone: str = Field(max_length=20)

    @field_validator("name")
    @classmethod
    def _name(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("이름을 적어 주세요.")
        return v

    @field_validator("relation")
    @classmethod
    def _relation(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("어떤 사이인지 골라 주세요.")
        return v

    @field_validator("phone")
    @classmethod
    def _phone(cls, v: str) -> str:
        digits = normalize_phone(v)
        if not 9 <= len(digits) <= 11:
            raise ValueError("전화번호를 다시 확인해 주세요.")
        return digits


class GuardianOut(BaseModel):
    id: uuid.UUID
    name: str
    relation: str
    phone_masked: str = Field(description="010-****-5678")
    phone: str = Field(description="전화 걸기용 숫자 (본인 화면에서만)")

    @classmethod
    def of(cls, g: GuardianView) -> "GuardianOut":
        return cls(
            id=g.id, name=g.name, relation=g.relation, phone_masked=g.phone_masked, phone=g.phone
        )


class SosNotified(BaseModel):
    name: str
    relation: str


class SosOut(BaseModel):
    id: uuid.UUID
    created_at: datetime
    notified: list[SosNotified] = Field(description="알린 사람들 (보호자 + 담당 복지사)")

    @classmethod
    def of(cls, r: SosResult) -> "SosOut":
        return cls(
            id=r.id,
            created_at=r.created_at,
            notified=[SosNotified(**n) for n in r.notified],
        )
