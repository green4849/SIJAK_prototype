"""C12 대화 주제 추천 규칙"""

from app.domains.auth.constants import INTERESTS
from app.domains.chat.topics import GENERAL, MAX_TOPICS, PHRASES, suggest


def test_every_interest_has_two_phrases() -> None:
    assert set(PHRASES) == set(INTERESTS)
    assert all(len(p) == 2 for p in PHRASES.values())


def test_common_first_then_theirs_then_general() -> None:
    out = suggest(["walking", "music"], ["tv", "walking"])
    assert [(t.label, t.common) for t in out] == [
        ("산책·등산", True),
        ("TV·드라마", False),
        ("산책·등산", True),
        ("TV·드라마", False),
    ]
    assert out[0].text != out[2].text  # 같은 관심사는 다른 문구


def test_no_interests_falls_back_to_general() -> None:
    out = suggest([], [])
    assert [t.text for t in out] == GENERAL[:MAX_TOPICS]
    assert all(t.label == "일상" for t in out)
