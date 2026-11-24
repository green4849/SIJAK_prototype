"""성향조사(8문항)와 추천 적합도 — 사용자가 준 질문지·알고리즘(2026-11-24) 그대로.

점수 = 30H + 10G + 10P + 15T + 10F + 25R (각 0~1, 반올림해 0~100)
  H 취미 유사도      Q1 좋아하는 활동 (가입 '좋아하는 것'과 같은 목록)
  G 활동 목적 적합도  Q2 새 친구와 하고 싶은 일
  P 선호 장소 유사도  Q3 만나고 싶은 곳
  T 활동 시간 일치도  Q4 편한 시간
  F 만남 빈도 적합도  Q5 만나고 싶은 횟수
  R 관계 성향        (D(A→B) + D(B→A)) / 2
      D(A→B) = A가 바라는 친구(Q7)에 B의 모습이 얼마나 가까운지
               (B의 Q6 대화 습관 · Q8 나를 표현하는 단어).
      A가 '취미를 함께 즐기는 친구'를 골랐으면 대신 (H + G) / 2.

질문지에 없는 세부(사용자가 정하지 않은 것)는 여기서 정했다.
바꾸면 frontend/src/demo/matching.ts 도 같이:
  - 여러 개 고르는 문항(H·P·T): 겹친 수 ÷ 둘 중 적게 고른 수 (내가 고른 것이 상대에게 다 있으면 1)
  - T: 한쪽이라도 '시간 상관없음'이면 1
  - G: 같으면 1, '함께 취미·산책·운동·지역 모임'처럼 밖에서 함께하는 것끼리는 0.5,
       '일상 이야기'와 나머지는 0
  - F: 네 단계(여러 번 · 한 번 · 한 달에 몇 번 · 가끔) 중 같으면 1, 한 칸 차이 0.5, 그보다 멀면 0
  - D: Q6 맞음(1·0.5·0) 과 Q8에 바라는 성격 단어가 하나라도 있는지(1·0)의 평균
  - 성향조사를 안 한 쪽이 있으면 G·P·T·F·R은 0 — 그때는 가입 때 고른 관심사(H)로만 줄 세운다
"""

import math
from dataclasses import dataclass, field

from app.domains.auth.constants import INTERESTS, MAX_INTERESTS

# ---------- 문항 ----------

PURPOSES = {
    "chat": "편하게 일상 이야기 나누기",
    "hobby": "함께 취미활동 즐기기",
    "exercise": "산책하거나 운동하기",
    "community": "지역 모임 및 행사 참여하기",
}
PLACES = {"park": "공원", "cafe": "카페", "center": "복지관·문화센터", "restaurant": "동네 식당"}
TIMES = {
    "weekday_am": "평일 오전",
    "weekday_pm": "평일 오후",
    "weekday_eve": "평일 저녁",
    "weekend": "주말",
    "any": "시간 상관없음",
}
FREQUENCIES = {
    "often": "일주일에 여러 번",
    "weekly": "일주일에 한 번",
    "monthly": "한 달에 몇 번",
    "sometimes": "가끔 편할 때",
}
TALK_STYLES = {
    "talker": "먼저 이야기를 꺼내는 편이에요.",
    "listener": "상대방의 이야기를 주로 들어주는 편이에요.",
    "balanced": "이야기하고 듣는 것을 비슷하게 해요.",
}
WANTS = {
    "listener": "이야기를 잘 들어주는 친구",
    "lively": "밝고 활발한 친구",
    "calm": "조용하고 차분한 친구",
    "hobby": "취미를 함께 즐기는 친구",
}
TRAITS = {
    "lively": "활발함",
    "calm": "차분함",
    "warm": "다정함",
    "listening": "경청",
    "curious": "호기심",
    "careful": "신중함",
    "planned": "계획적",
    "spontaneous": "즉흥적",
    "caring": "배려심",
    "humor": "유머감각",
}
MAX_PLACES = 2
MAX_TRAITS = 3


@dataclass(frozen=True)
class Question:
    key: str
    step: str
    text: str
    hint: str
    options: dict[str, str]
    min: int = 1
    max: int = 1


QUESTIONS = [
    Question(
        "interests",
        "나의 관심사",
        "평소 어떤 활동을 좋아하시나요?",
        f"1개부터 {MAX_INTERESTS}개까지 골라 주세요",
        INTERESTS,
        max=MAX_INTERESTS,
    ),
    Question(
        "purpose",
        "나의 관심사",
        "새 친구와 가장 하고 싶은 일은 무엇인가요?",
        "하나만 골라 주세요",
        PURPOSES,
    ),
    Question(
        "places",
        "나의 생활 방식",
        "친구와 주로 어디에서 만나고 싶으신가요?",
        f"{MAX_PLACES}개까지 골라 주세요",
        PLACES,
        max=MAX_PLACES,
    ),
    Question(
        "times",
        "나의 생활 방식",
        "주로 언제 활동하기 편하신가요?",
        "여러 개 골라도 돼요",
        TIMES,
        max=len(TIMES),
    ),
    Question(
        "frequency",
        "나의 생활 방식",
        "친구와 얼마나 자주 만나고 싶으신가요?",
        "하나만 골라 주세요",
        FREQUENCIES,
    ),
    Question(
        "talk_style",
        "나의 관계 성향",
        "처음 만난 친구와 이야기할 때, 평소 나는 어떤 편인가요?",
        "정답은 없어요. 평소 내 모습에 가까운 답을 골라 주세요",
        TALK_STYLES,
    ),
    Question(
        "want",
        "나의 관계 성향",
        "어떤 친구와 함께할 때 가장 편안하신가요?",
        "하나만 골라 주세요",
        WANTS,
    ),
    Question(
        "traits",
        "나의 관계 성향",
        "나를 가장 잘 표현하는 단어는 무엇인가요?",
        f"{MAX_TRAITS}개까지 골라 주세요",
        TRAITS,
        max=MAX_TRAITS,
    ),
]


@dataclass(frozen=True)
class Answers:
    """Q2~Q8 (Q1은 사용자 관심사로 따로 저장)"""

    purpose: str
    places: list[str]
    times: list[str]
    frequency: str
    talk_style: str
    want: str
    traits: list[str]


def validate(interests: list[str], a: Answers) -> str | None:
    """문제가 있으면 사용자에게 보일 문구, 없으면 None"""
    multi = {"interests": interests, "places": a.places, "times": a.times, "traits": a.traits}
    single = {
        "purpose": a.purpose,
        "frequency": a.frequency,
        "talk_style": a.talk_style,
        "want": a.want,
    }
    for i, q in enumerate(QUESTIONS, start=1):
        if q.key in multi:
            chosen = multi[q.key]
            if not chosen or any(c not in q.options for c in chosen):
                return f"{i}번 질문에 답해 주세요."
            if len(set(chosen)) > q.max:
                return f"{i}번 질문은 {q.max}개까지 고를 수 있어요."
        elif single[q.key] not in q.options:
            return f"{i}번 질문에 답해 주세요."
    if "any" in a.times and len(a.times) > 1:
        return "4번 질문은 '시간 상관없음'만 고르거나, 다른 시간만 골라 주세요."
    return None


# ---------- 적합도 ----------

WEIGHTS = {"H": 30, "G": 10, "P": 10, "T": 15, "F": 10, "R": 25}
_OUTDOOR = {"hobby", "exercise", "community"}
_FREQ_ORDER = list(FREQUENCIES)
# Q7 바라는 친구 → (Q6 대화 습관 점수, Q8에서 찾는 단어)
_WANT_FIT: dict[str, tuple[dict[str, float], set[str]]] = {
    "listener": ({"listener": 1, "balanced": 0.5, "talker": 0}, {"listening", "caring", "warm"}),
    "lively": ({"talker": 1, "balanced": 0.5, "listener": 0}, {"lively", "humor", "curious"}),
    "calm": ({"listener": 1, "balanced": 0.5, "talker": 0}, {"calm", "careful", "planned"}),
}
GOOD_MATCH = 70  # '잘 맞아요'
SOME_MATCH = 50  # '비슷한 점이 많아요'
MAX_REASONS = 3


def _round(x: float) -> int:
    """JS Math.round 와 같게 (.5는 올림) — 시연 서버와 점수가 똑같도록"""
    return math.floor(x + 0.5)


def overlap(a: list[str], b: list[str]) -> float:
    if not a or not b:
        return 0.0
    return len(set(a) & set(b)) / min(len(set(a)), len(set(b)))


def purpose_fit(a: str, b: str) -> float:
    if a == b:
        return 1.0
    return 0.5 if a in _OUTDOOR and b in _OUTDOOR else 0.0


def time_fit(a: list[str], b: list[str]) -> float:
    if "any" in a or "any" in b:
        return 1.0 if a and b else 0.0
    return overlap(a, b)


def frequency_fit(a: str, b: str) -> float:
    d = abs(_FREQ_ORDER.index(a) - _FREQ_ORDER.index(b))
    return {0: 1.0, 1: 0.5}.get(d, 0.0)


def desire_fit(wanter: Answers, other: Answers, h: float, g: float) -> float:
    """D(A→B): A가 바라는 친구에 B가 얼마나 가까운지"""
    if wanter.want == "hobby":
        return (h + g) / 2
    talk, words = _WANT_FIT[wanter.want]
    return (talk[other.talk_style] + (1.0 if words & set(other.traits) else 0.0)) / 2


@dataclass(frozen=True)
class Match:
    score: int
    #: '잘 맞아요' · '비슷한 점이 많아요' · None (말로만 보여 주고 점수는 순서에만 쓴다)
    label: str | None
    reasons: list[str] = field(default_factory=list)


# 이유 문장 — 조사까지 붙여 둔다 (화면에서 '이(가)' 같은 표기를 쓰지 않으려고)
_TIME_SUBJECT = {
    "weekday_am": "평일 오전이",
    "weekday_pm": "평일 오후가",
    "weekday_eve": "평일 저녁이",
    "weekend": "주말이",
}
_PURPOSE_REASON = {
    "chat": "둘 다 편하게 이야기 나누고 싶어 해요",
    "hobby": "둘 다 취미를 함께 즐기고 싶어 해요",
    "exercise": "둘 다 함께 걷거나 운동하고 싶어 해요",
    "community": "둘 다 동네 모임에 나가고 싶어 해요",
}
_WANT_REASON = {
    "listener": "바라시던 '이야기를 잘 들어주는' 분이에요",
    "lively": "바라시던 '밝고 활발한' 분이에요",
    "calm": "바라시던 '조용하고 차분한' 분이에요",
    "hobby": "바라시던 '취미를 함께 즐길' 분이에요",
}


def match(
    my_interests: list[str],
    their_interests: list[str],
    mine: Answers | None,
    theirs: Answers | None,
) -> Match:
    h = overlap(my_interests, their_interests)
    if mine is None or theirs is None:
        return Match(score=_round(WEIGHTS["H"] * h), label=None)

    g = purpose_fit(mine.purpose, theirs.purpose)
    p = overlap(mine.places, theirs.places)
    t = time_fit(mine.times, theirs.times)
    f = frequency_fit(mine.frequency, theirs.frequency)
    d_me = desire_fit(mine, theirs, h, g)
    d_them = desire_fit(theirs, mine, h, g)
    r = (d_me + d_them) / 2
    w = WEIGHTS
    score = _round(w["H"] * h + w["G"] * g + w["P"] * p + w["T"] * t + w["F"] * f + w["R"] * r)
    label = (
        "잘 맞아요"
        if score >= GOOD_MATCH
        else "비슷한 점이 많아요"
        if score >= SOME_MATCH
        else None
    )

    # 이유 — 공통 취미는 카드의 '같이 좋아해요' 칩이 보여 주므로, 그 밖의 것을 많이 맞는 순으로
    reasons: list[str] = []
    common_times = [x for x in mine.times if x in theirs.times and x in _TIME_SUBJECT]
    if common_times:
        reasons.append(f"둘 다 {_TIME_SUBJECT[common_times[0]]} 편해요")
    if d_me >= 0.75:
        reasons.append(_WANT_REASON[mine.want])
    common_places = [x for x in mine.places if x in theirs.places]
    if common_places:
        reasons.append(f"둘 다 {PLACES[common_places[0]]}에서 만나고 싶어 해요")
    if g == 1:
        reasons.append(_PURPOSE_REASON[mine.purpose])
    if f == 1:
        reasons.append("만나고 싶은 횟수가 비슷해요")
    return Match(score=score, label=label, reasons=reasons[:MAX_REASONS])
