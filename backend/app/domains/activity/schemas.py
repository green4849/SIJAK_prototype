import uuid
from datetime import datetime

from pydantic import BaseModel

from app.domains.activity.models import CATEGORIES
from app.domains.activity.service import ActivityView


class ActivityOut(BaseModel):
    id: uuid.UUID
    title: str
    subtitle: str
    category: str
    category_label: str
    place: str
    schedule_text: str
    starts_at: datetime
    ends_at: datetime
    capacity: int
    applied_count: int
    is_full: bool
    applied: bool
    liked: bool
    description: str
    image_kind: str

    @classmethod
    def of(cls, v: ActivityView) -> "ActivityOut":
        a = v.activity
        return cls(
            id=a.id,
            title=a.title,
            subtitle=a.subtitle,
            category=a.category,
            category_label=CATEGORIES.get(a.category, a.category),
            place=a.place,
            schedule_text=a.schedule_text,
            starts_at=a.starts_at,
            ends_at=a.ends_at,
            capacity=a.capacity,
            applied_count=v.applied_count,
            is_full=v.is_full,
            applied=v.applied,
            liked=v.liked,
            description=a.description,
            image_kind=a.image_kind,
        )


class CategoryOption(BaseModel):
    code: str
    label: str


class MyActivityCounts(BaseModel):
    applied: int
    liked: int
