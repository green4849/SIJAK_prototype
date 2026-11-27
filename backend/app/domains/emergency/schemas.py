import uuid
from datetime import datetime
from typing import Literal

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
    status: Literal["sent", "failed", "not_sent"] = Field(
        description="이 보호자에게 보낸 문자: sent 보냄 · failed 못 보냄(예약 작업이 다시 시도) · "
        "not_sent 문자 발송이 꺼져 있어 기록만"
    )


class SosOut(BaseModel):
    id: uuid.UUID
    created_at: datetime
    notified: list[SosNotified] = Field(description="요청 시 등록된 보호자와 문자 결과")
    delivery_status: Literal["not_sent", "sent", "partial", "failed"] = Field(
        description="문자 결과 전체: sent 모두 · partial 일부 · failed 모두 못 보냄 · "
        "not_sent 발송 꺼짐 또는 보호자 없음"
    )

    @classmethod
    def of(cls, r: SosResult) -> "SosOut":
        return cls(
            id=r.id,
            created_at=r.created_at,
            notified=[SosNotified(**n) for n in r.notified],
            delivery_status=r.delivery_status,
        )


class EmergencyInfoOut(BaseModel):
    sms_enabled: bool = Field(description="긴급 도움을 누르면 보호자에게 문자를 보내는지")
