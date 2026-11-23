"""시연 시드가 실제 칸 길이·규칙을 지키는지 — 빈 DB에서 `python -m scripts.seed` 가 깨지지 않게"""

from app.domains.auth.constants import INTRO_MAX_LEN
from scripts.seed import DEMO_USERS


def test_demo_intros_fit_column() -> None:
    too_long = [(u[0], len(u[5])) for u in DEMO_USERS if len(u[5]) > INTRO_MAX_LEN]
    assert too_long == []
