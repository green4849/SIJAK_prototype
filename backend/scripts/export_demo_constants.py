"""시연(브라우저 안 가짜 서버)이 손으로 복사해 둔 백엔드 값을 파일로 내보낸다 (H37).

    uv run python -m scripts.export_demo_constants          # 파일 갱신
    uv run python -m scripts.export_demo_constants --check  # 최신이 아니면 실패 (CI)

결과: frontend/e2e/backend-constants.json (시험에서만 읽음 — 앱 번들에는 안 들어감)
→ frontend/e2e/demo-constants.spec.ts 가 시연 사본(src/demo/*.ts)과 하나하나 비교한다.
값을 바꾸면 이 파일을 다시 만들고, 시연 사본도 같이 고쳐야 CI가 통과한다.

성향조사 점수처럼 계산 규칙까지 복사한 것은, 정해진 입력 쌍을 백엔드로 계산한 결과를 함께 담아
시연 계산이 같은 답을 내는지 본다.
"""

import json
import random
import sys
from dataclasses import asdict
from pathlib import Path

from app.domains.activity.models import CATEGORIES, REWARD_CATEGORIES
from app.domains.auth.constants import INTERESTS, INTRO_MAX_LEN, MAX_INTERESTS, REGIONS
from app.domains.chat import topics
from app.domains.chat.service import TEXT_MAX
from app.domains.friend import nearby, survey
from app.domains.friend.schemas import SurveyOut
from app.domains.notification.models import MAX_PER_DAY, TIME_SLOTS
from app.domains.point import service as point
from app.domains.point.models import REASONS as POINT_REASONS
from app.domains.risk.models import REPORT_REASONS
from app.domains.risk.rules import RULES

OUT = Path(__file__).resolve().parents[2] / "frontend" / "e2e" / "backend-constants.json"
MATCH_CASES = 40


def _random_answers(rng: random.Random) -> survey.Answers:
    def some(options: dict[str, str], most: int) -> list[str]:
        return rng.sample(list(options), rng.randint(1, most))

    return survey.Answers(
        purpose=rng.choice(list(survey.PURPOSES)),
        places=some(survey.PLACES, survey.MAX_PLACES),
        times=some(survey.TIMES, 2),
        frequency=rng.choice(list(survey.FREQUENCIES)),
        talk_style=rng.choice(list(survey.TALK_STYLES)),
        want=rng.choice(list(survey.WANTS)),
        traits=some(survey.TRAITS, survey.MAX_TRAITS),
    )


def _match_cases() -> list[dict]:
    """고정 씨앗으로 만든 입력 쌍 — 매번 같은 파일이 나오게"""
    rng = random.Random(37)
    cases = []
    for i in range(MATCH_CASES):
        mine_i = rng.sample(list(INTERESTS), rng.randint(1, MAX_INTERESTS))
        theirs_i = rng.sample(list(INTERESTS), rng.randint(1, MAX_INTERESTS))
        # 몇 개는 성향조사 없이 (관심사만으로 점수)
        mine = _random_answers(rng) if i % 8 else None
        theirs = _random_answers(rng)
        m = survey.match(mine_i, theirs_i, mine, theirs)
        cases.append(
            {
                "my_interests": mine_i,
                "their_interests": theirs_i,
                "mine": asdict(mine) if mine else None,
                "theirs": asdict(theirs),
                "expected": {"score": m.score, "label": m.label, "reasons": m.reasons},
            }
        )
    return cases


def build() -> dict:
    return {
        "_설명": "scripts/export_demo_constants.py 가 만든 파일 — 손으로 고치지 말 것",
        "auth": {
            "regions": REGIONS,
            "interests": INTERESTS,
            "max_interests": MAX_INTERESTS,
            "intro_max_len": INTRO_MAX_LEN,
        },
        "chat": {"text_max": TEXT_MAX},
        "activity": {"categories": CATEGORIES, "reward_categories": sorted(REWARD_CATEGORIES)},
        "points": {
            "welcome": point.WELCOME_BONUS,
            "rating": point.RATING_REWARD,
            "ratingDailyLimit": point.RATING_DAILY_LIMIT,
            "volunteer": point.VOLUNTEER_REWARD,
            "firstFriends": point.FIRST_FRIENDS_REWARD,
            "friendRequest": point.FRIEND_REQUEST_COST,
            "reasons": POINT_REASONS,
        },
        "notification": {"time_slots": TIME_SLOTS, "max_per_day": MAX_PER_DAY},
        "risk": {
            "report_reasons": REPORT_REASONS,
            "rules": [[code, label, level, patterns] for code, label, level, patterns in RULES],
        },
        "nearby": {
            "default_radius_km": nearby.DEFAULT_RADIUS_KM,
            "recommend_radius_km": nearby.RECOMMEND_RADIUS_KM,
        },
        "topics": {
            "phrases": topics.PHRASES,
            "general": topics.GENERAL,
            "max_topics": topics.MAX_TOPICS,
        },
        "survey": {
            # 실제 API(GET /friends/survey)가 보내는 모양 그대로 — 시연도 이 모양으로 돌려준다
            "questions": [q.model_dump() for q in SurveyOut.of([], None).questions],
            "match_cases": _match_cases(),
        },
    }


def render() -> str:
    return json.dumps(build(), ensure_ascii=False, indent=2) + "\n"


def main() -> int:
    text = render()
    if "--check" in sys.argv:
        if not OUT.exists() or OUT.read_text(encoding="utf-8") != text:
            print(
                "backend-constants.json 이 백엔드와 다릅니다. "
                "`uv run python -m scripts.export_demo_constants` 후 시연 사본도 맞춰 커밋하세요.",
                file=sys.stderr,
            )
            return 1
        print("backend-constants.json 최신")
        return 0
    OUT.write_text(text, encoding="utf-8")
    print(f"→ {OUT.relative_to(Path.cwd().parent)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
