import uuid

from pydantic import BaseModel, Field


class ReportCreate(BaseModel):
    target_user_id: uuid.UUID
    reason: str
    message_id: int | None = None
    also_block: bool = Field(True, description="신고하면서 바로 차단 (기본)")


class BlockCreate(BaseModel):
    user_id: uuid.UUID


class BlockedUser(BaseModel):
    user_id: uuid.UUID
    name: str


class ReasonOption(BaseModel):
    code: str
    label: str
