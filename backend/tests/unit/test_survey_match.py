"""성향조사 적합도 (friend/survey.py) — 30H + 10G + 10P + 15T + 10F + 25R"""

import math

from app.domains.friend.survey import Answers, match, validate

BASE = Answers(
    purpose="hobby",
    places=["park", "cafe"],
    times=["weekday_am"],
    frequency="weekly",
    talk_style="balanced",
    want="listener",
    traits=["calm", "caring"],
)


def ans(**kw: object) -> Answers:
    return Answers(**{**BASE.__dict__, **kw})  # type: ignore[arg-type]


def test_identical_answers_score_high_with_reasons() -> None:
    m = match(["walking"], ["walking"], BASE, BASE)
    # H1 G1 P1 T1 F1, D: listener ← balanced 0.5 + caring 있음 1 → 0.75 (양쪽) → R 0.75
    assert m.score == 94  # 93.75
    assert m.label == "잘 맞아요"
    assert m.reasons == [
        "둘 다 평일 오전이 편해요",
        "바라시던 '이야기를 잘 들어주는' 분이에요",
        "둘 다 공원에서 만나고 싶어 해요",
    ]


def test_without_survey_only_interests_count() -> None:
    m = match(["walking", "movies"], ["walking"], BASE, None)
    assert m.score == 30 and m.label is None and m.reasons == []
    assert match(["walking"], ["fishing"], None, None).score == 0


def test_each_part() -> None:
    other = ans(
        purpose="exercise",  # 밖에서 함께하는 것끼리 0.5
        places=["center"],  # 0
        times=["any"],  # 상관없음 → 1
        frequency="monthly",  # 한 칸 차이 0.5
        talk_style="listener",
        traits=["listening"],
    )
    m = match(["walking", "cooking"], ["walking", "reading", "travel"], BASE, other)
    # H = 1/2 (적게 고른 쪽 2개 중 1개)
    # D(나→상대): listener ← listener 1, 경청 있음 1 → 1
    # D(상대→나): listener ← balanced 0.5, 배려심 있음 1 → 0.75 → R 0.875
    expected = 30 * 0.5 + 10 * 0.5 + 0 + 15 * 1 + 10 * 0.5 + 25 * 0.875
    assert m.score == math.floor(expected + 0.5)
    assert m.label == "비슷한 점이 많아요"
    assert m.reasons == ["바라시던 '이야기를 잘 들어주는' 분이에요"]


def test_hobby_friend_uses_interests_and_purpose() -> None:
    a = ans(want="hobby")
    b = ans(want="hobby", talk_style="talker", traits=["humor"])
    # 둘 다 '취미를 함께 즐기는 친구' → D = (H + G) / 2 = 1
    assert match(["fishing"], ["fishing"], a, b).score == 100
    # 57.5 → 58 (.5는 올림, 시연 서버의 Math.round 와 같게)
    assert match(["fishing"], ["movies"], a, b).score == 58


def test_validate() -> None:
    assert validate(["walking"], BASE) is None
    assert validate([], BASE) == "1번 질문에 답해 주세요."
    assert validate(["walking"] * 1 + ["a"], BASE) == "1번 질문에 답해 주세요."
    assert validate(["walking"], ans(places=["park", "cafe", "center"])) == (
        "3번 질문은 2개까지 고를 수 있어요."
    )
    assert validate(["walking"], ans(times=["any", "weekend"])) is not None
    assert validate(["walking"], ans(want="rich")) == "7번 질문에 답해 주세요."
    assert validate(["walking"], ans(traits=["calm", "warm", "humor", "careful"])) == (
        "8번 질문은 3개까지 고를 수 있어요."
    )
