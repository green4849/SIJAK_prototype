import uuid
from datetime import UTC, datetime
from typing import Literal

from pydantic import BaseModel, Field

from app.domains.auth.constants import INTERESTS, REGIONS
from app.domains.auth.service import age_on
from app.domains.friend.service import Candidate, RatingResult
from app.domains.friend.survey import QUESTIONS, Answers


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
    my_rating: Literal["like", "neutral", "dislike"] | None = Field(
        description="내가 남긴 추천 평가. 상대에게는 보이지 않는다"
    )
    match_label: str | None = Field(
        default=None,
        description="추천 탭 — 적합도를 말로 ('잘 맞아요' · '비슷한 점이 많아요'). 점수는 안 보냄",
    )
    reasons: list[str] = Field(
        default_factory=list,
        description="추천 탭 — 추천 이유 최대 3개 (공통 취미 제외). 예: '둘 다 평일 오전이 편해요'",
    )

    @classmethod
    def of(cls, c: Candidate) -> "FriendCard":
        u = c.user
        return cls(
            user_id=u.id,
            name=u.name,
            age=age_on(u.birth_date, datetime.now(UTC).date()),
            gender=u.gender,  # type: ignore[arg-type]
            intro=u.intro,
            region_name=" ".join(
                filter(None, [REGIONS.get(u.region_code, u.region_code), u.area_name])
            ),
            interests=[INTERESTS.get(i.category, i.category) for i in u.interests],
            common_interests=[INTERESTS.get(x, x) for x in c.common_interests],
            distance_km=c.distance_km,
            relation=c.relation,
            request_id=c.request_id,
            my_rating=c.my_rating,
            match_label=c.match_label,
            reasons=c.reasons or [],
        )


class FriendRequestCreate(BaseModel):
    to_user_id: uuid.UUID


class RatingCreate(BaseModel):
    rating: Literal["like", "neutral", "dislike"]


class RatingOut(BaseModel):
    rating: Literal["like", "neutral", "dislike"]
    points_earned: int = Field(description="이번 평가로 받은 포인트 (못 받으면 0)")
    ratings_left_today: int

    @classmethod
    def of(cls, r: RatingResult) -> "RatingOut":
        return cls(
            rating=r.rating, points_earned=r.points_earned, ratings_left_today=r.ratings_left_today
        )


# ---------- 성향조사 ----------

SurveyKey = Literal[
    "interests", "purpose", "places", "times", "frequency", "talk_style", "want", "traits"
]


class SurveyOption(BaseModel):
    code: str
    label: str


class SurveyQuestion(BaseModel):
    key: SurveyKey
    step: str = Field(description="묶음 이름 — '나의 관심사' · '나의 생활 방식' · '나의 관계 성향'")
    text: str
    hint: str
    min: int
    max: int = Field(description="1이면 하나만 고른다")
    options: list[SurveyOption]


class SurveyAnswers(BaseModel):
    """Q1 interests(가입 '좋아하는 것'과 같은 코드) · Q2~Q8"""

    interests: list[str] = Field(max_length=20)
    purpose: str = Field(max_length=20)
    places: list[str] = Field(max_length=10)
    times: list[str] = Field(max_length=10)
    frequency: str = Field(max_length=20)
    talk_style: str = Field(max_length=20)
    want: str = Field(max_length=20)
    traits: list[str] = Field(max_length=20)

    def to_answers(self) -> Answers:
        return Answers(
            purpose=self.purpose,
            places=list(dict.fromkeys(self.places)),
            times=list(dict.fromkeys(self.times)),
            frequency=self.frequency,
            talk_style=self.talk_style,
            want=self.want,
            traits=list(dict.fromkeys(self.traits)),
        )

    @classmethod
    def of(cls, interests: list[str], a: Answers) -> "SurveyAnswers":
        return cls(interests=interests, **a.__dict__)


class SurveyOut(BaseModel):
    questions: list[SurveyQuestion]
    answers: SurveyAnswers | None = Field(description="아직 안 했으면 null")
    #: 안 했어도 Q1은 가입 때 고른 관심사로 미리 채울 수 있게
    my_interests: list[str]

    @classmethod
    def of(cls, interests: list[str], a: Answers | None) -> "SurveyOut":
        return cls(
            questions=[
                SurveyQuestion(
                    key=q.key,  # type: ignore[arg-type]
                    step=q.step,
                    text=q.text,
                    hint=q.hint,
                    min=q.min,
                    max=q.max,
                    options=[SurveyOption(code=k, label=v) for k, v in q.options.items()],
                )
                for q in QUESTIONS
            ],
            answers=SurveyAnswers.of(interests, a) if a else None,
            my_interests=interests,
        )
