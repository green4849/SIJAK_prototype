"""마음 건강 (C11) — 사회적 관계 지수 + 자가평가.

사회적 관계 지수 = 보고서 4.5.3 고립 지수 II = 100 − (0.25A + 0.30C + 0.20E + 0.15S + 0.10R) 를
뒤집은 값 (높을수록 좋음). 계산은 데모(frontend/src/demo/wellbeing.ts)를 그대로 옮겼다:
  A 앱 활동   : 마지막 접속에서 하루 지날 때마다 15점씩 깎는다
  C 대화      : 최근 14일 이웃에게 보낸 메시지 × 12 (말동무(AI)와 한 말은 넣지 않는다)
  E 마음      : 말동무 대화 정서 — 말동무 백엔드(C8)가 없어 지금은 기본값 70
  S 이웃 만남 : 친구 수 × 20 + 신청한 활동 수 × 15
  R 답장      : 알림 응답 속도 — 측정 전이라 고정 70
자가평가: PHQ-9 · GAD-7 (쉬운 말로 다듬은 문항), 점수 구간은 표준 기준.
"""

import math
import uuid
from dataclasses import dataclass
from datetime import UTC, date, datetime, timedelta, timezone
from typing import TYPE_CHECKING

from app.core.errors import DomainError
from app.domains.activity.service import ActivityService
from app.domains.chat.service import ChatService
from app.domains.friend.service import FriendService
from app.domains.wellbeing.models import SelfAssessment
from app.domains.wellbeing.repository import WellbeingRepository

if TYPE_CHECKING:
    from app.domains.auth.models import User

KST = timezone(timedelta(hours=9))
DAY = timedelta(days=1)

WEIGHTS = {
    "activity": 0.25,
    "communication": 0.30,
    "emotion": 0.20,
    "social": 0.15,
    "responsiveness": 0.10,
}
FACTOR_LABELS = {
    "activity": "앱 활동",
    "communication": "대화",
    "emotion": "마음",
    "social": "이웃 만남",
    "responsiveness": "답장",
}
EMOTION_DEFAULT = 70  # 말동무 대화가 없을 때 (데모와 같음)
RESPONSIVENESS_FIXED = 70
TALK_WINDOW_DAYS = 14
PAST_WEEKS = 3  # 화면 '4주 변화' = 지난 3주 + 이번 주


def _clamp(n: float) -> int:
    # JS Math.round 와 같게 (0.5 는 올림)
    return max(0, min(100, math.floor(n + 0.5)))


def level_of(score: int) -> str:
    """보고서 고립 지수 단계(0~30 정상 · 30~60 주의 · 60~80 위험 · 80~ 긴급)를 뒤집은 경계"""
    if score > 70:
        return "normal"
    if score > 40:
        return "caution"
    if score > 20:
        return "risk"
    return "urgent"


@dataclass(frozen=True)
class Factor:
    code: str
    label: str
    score: int


@dataclass(frozen=True)
class Mood:
    level: str
    talked: int
    heavy: int
    crisis: bool


@dataclass(frozen=True)
class RelationIndex:
    score: int
    level: str
    factors: list[Factor]
    #: (라벨, 점수) — 지난 주들 → 이번 주
    weekly: list[tuple[str, int]]
    mood: Mood
    updated_at: datetime


# ---------- 자가평가 문항 ----------

OPTIONS = [
    (0, "전혀 없었어요"),
    (1, "며칠 있었어요"),
    (2, "일주일 넘게"),
    (3, "거의 매일"),
]
LEAD = "지난 2주 동안 이런 일이 얼마나 있었나요?"


@dataclass(frozen=True)
class AssessmentForm:
    kind: str
    title: str
    lead: str
    questions: list[str]
    options: list[tuple[int, str]]


FORMS = {
    "phq9": AssessmentForm(
        kind="phq9",
        title="기분 점검",
        lead=LEAD,
        options=OPTIONS,
        questions=[
            "하고 싶은 일이 없고, 무엇을 해도 재미가 없었다",
            "기분이 가라앉거나, 우울하거나, 희망이 없다고 느꼈다",
            "잠들기 어렵거나 자주 깼다. 또는 너무 많이 잤다",
            "피곤하고 기운이 없었다",
            "입맛이 없었다. 또는 너무 많이 먹었다",
            "내가 못났다거나, 가족을 실망시켰다는 생각이 들었다",
            "신문이나 TV를 볼 때 집중하기 어려웠다",
            "남들이 알아챌 만큼 느리게 움직였다. 또는 안절부절못했다",
            "차라리 죽는 게 낫겠다거나, 나를 해치고 싶은 생각이 들었다",
        ],
    ),
    "gad7": AssessmentForm(
        kind="gad7",
        title="걱정 점검",
        lead=LEAD,
        options=OPTIONS,
        questions=[
            "초조하거나 불안하거나 조마조마했다",
            "걱정을 멈추기 어려웠다",
            "여러 가지 일을 너무 많이 걱정했다",
            "편하게 쉬기 어려웠다",
            "너무 안절부절못해서 가만히 있기 어려웠다",
            "쉽게 짜증이 나거나 화가 났다",
            "무언가 끔찍한 일이 생길 것처럼 두려웠다",
        ],
    ),
}
# PHQ-9 9번(죽음·자해 생각) — 0보다 크면 상담 전화 안내
PHQ9_CRISIS_INDEX = 8

# (이 점수까지, 단계, 문구, 권하는 일)
LEVELS = [
    (4, "minimal", "괜찮아요", "마음이 편안한 편이에요. 지금처럼 이웃과 자주 이야기 나눠요."),
    (
        9,
        "mild",
        "조금 지쳐 있어요",
        "가벼운 산책이나 동네 모임이 도움이 돼요. 2주 뒤에 다시 점검해 봐요.",
    ),
    (
        14,
        "moderate",
        "마음이 많이 힘들어요",
        "혼자 견디지 마세요. 복지관 상담 선생님이나 가족과 이야기해 보세요.",
    ),
    (
        99,
        "severe",
        "도움이 꼭 필요해요",
        "전문가와 꼭 이야기해 보세요. 109에 전화하면 하루 종일 상담해 줘요.",
    ),
]
RECENT_ASSESSMENTS = 20


@dataclass(frozen=True)
class AssessmentResult:
    id: int
    kind: str
    title: str
    score: int
    max_score: int
    level: str
    level_label: str
    advice: str
    crisis: bool
    created_at: datetime


@dataclass(frozen=True)
class WatchRow:
    """운영자 돌봄 목록 한 줄 (B7)"""

    user_id: uuid.UUID
    score: int
    #: 그 전 주 값 (없으면 None)
    previous: int | None
    level: str


class InvalidAssessmentError(DomainError):
    status_code = 422
    code = "validation_error"


def result_of(a: SelfAssessment) -> AssessmentResult:
    form = FORMS[a.kind]
    score = sum(a.answers)
    _, level, label, advice = next((lv for lv in LEVELS if score <= lv[0]), LEVELS[-1])
    return AssessmentResult(
        id=a.id,
        kind=a.kind,
        title=form.title,
        score=score,
        max_score=len(form.questions) * 3,
        level=level,
        level_label=label,
        advice=advice,
        crisis=a.kind == "phq9" and a.answers[PHQ9_CRISIS_INDEX] > 0,
        created_at=a.created_at,
    )


class WellbeingService:
    def __init__(
        self,
        repo: WellbeingRepository,
        chat: ChatService,
        friends: FriendService,
        activities: ActivityService,
    ) -> None:
        self.repo = repo
        self.chat = chat
        self.friends = friends
        self.activities = activities

    # ---------- 사회적 관계 지수 ----------

    async def relation_index(self, me: "User") -> RelationIndex:
        now = datetime.now(UTC)
        f = await self._factors(me, now)
        score = _clamp(sum(WEIGHTS[k] * f[k] for k in WEIGHTS))

        today = now.astimezone(KST).date()
        this_week = today - timedelta(days=today.weekday())
        past = await self.repo.weeks_before(me.id, this_week, PAST_WEEKS)
        await self.repo.save_week(me.id, this_week, score)
        await self.repo.commit()

        weekly = [(_weeks_ago_label(this_week, w.week_start), w.score) for w in past]
        weekly.append(("이번 주", score))
        return RelationIndex(
            score=score,
            level=level_of(score),
            factors=[Factor(code, FACTOR_LABELS[code], f[code]) for code in FACTOR_LABELS],
            weekly=weekly,
            # 말동무(C8) 백엔드가 생기면 최근 14일 대화 정서로 — 지금은 나눈 이야기 없음
            mood=Mood(level="none", talked=0, heavy=0, crisis=False),
            updated_at=now,
        )

    async def _factors(self, me: "User", now: datetime) -> dict[str, int]:
        last = me.last_login_at or now
        activity = _clamp(100 - (now - last) / DAY * 15)
        said = await self.chat.sent_count_since(me, now - TALK_WINDOW_DAYS * DAY)
        communication = _clamp(said * 12)
        friends = len(await self.friends.friend_ids(me.id))
        applied = (await self.activities.counts(me))["applied"]
        social = _clamp(friends * 20 + applied * 15)
        return {
            "activity": activity,
            "communication": communication,
            "emotion": EMOTION_DEFAULT,
            "social": social,
            "responsiveness": RESPONSIVENESS_FIXED,
        }

    async def lowest_recent(self, limit: int) -> list[WatchRow]:
        """이번 주나 지난주 지수가 '정상' 아래인 사람 — 낮은 순 (운영자 돌봄 목록, B7).

        지수는 본인이 화면을 볼 때 계산되므로, 2주 넘게 안 본 사람은 빠진다
        (주간 일괄 계산 작업이 생기면 모두 들어온다 — docs/deferred.md §7).
        """
        today = datetime.now(KST).date()
        this_week = today - timedelta(days=today.weekday())
        by_user: dict[uuid.UUID, list[tuple[date, int]]] = {}
        for w in await self.repo.weeks_since(this_week - timedelta(weeks=2)):
            by_user.setdefault(w.user_id, []).append((w.week_start, w.score))
        rows: list[WatchRow] = []
        for user_id, weeks in by_user.items():
            weeks.sort(reverse=True)
            latest_week, score = weeks[0]
            if latest_week < this_week - timedelta(weeks=1) or level_of(score) == "normal":
                continue
            previous = weeks[1][1] if len(weeks) > 1 else None
            rows.append(WatchRow(user_id, score, previous, level_of(score)))
        rows.sort(key=lambda r: r.score)
        return rows[:limit]

    # ---------- 자가평가 ----------

    @staticmethod
    def form(kind: str) -> AssessmentForm:
        return FORMS[kind]

    async def submit(self, user_id: uuid.UUID, kind: str, answers: list[int]) -> AssessmentResult:
        n = len(FORMS[kind].questions)
        if len(answers) != n or any(v not in (0, 1, 2, 3) for v in answers):
            raise InvalidAssessmentError("모든 질문에 답해 주세요.")
        a = await self.repo.add_assessment(user_id, kind, answers)
        await self.repo.commit()
        return result_of(a)

    async def history(self, user_id: uuid.UUID) -> list[AssessmentResult]:
        return [result_of(a) for a in await self.repo.assessments(user_id, RECENT_ASSESSMENTS)]


def _weeks_ago_label(this_week: date, week_start: date) -> str:
    return f"{(this_week - week_start).days // 7}주 전"
