"""시연 시드가 실제 칸 길이·규칙을 지키는지 — 빈 DB에서 `python -m scripts.seed` 가 깨지지 않게"""

from app.domains.auth.constants import INTRO_MAX_LEN
from scripts.seed import DEMO_USERS


def test_demo_intros_fit_column() -> None:
    too_long = [(u[0], len(u[5])) for u in DEMO_USERS if len(u[5]) > INTRO_MAX_LEN]
    assert too_long == []


def test_demo_surveys_are_valid() -> None:
    from app.domains.friend.survey import Answers, validate
    from scripts.seed import DEMO_SURVEYS

    users = {u[0]: u for u in DEMO_USERS}
    for name, answers in DEMO_SURVEYS.items():
        assert validate(users[name][6], Answers(**answers)) is None, name
