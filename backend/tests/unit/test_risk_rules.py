import json
from pathlib import Path

import pytest

from app.domains.risk.rules import assess_text

# 시연 사본(frontend/src/demo/rules.ts)도 같은 파일로 시험한다
# — frontend/e2e/risk-rules.spec.ts (H36)
_FIXTURE = Path(__file__).parents[1] / "fixtures" / "risk_cases.json"
CASES = json.loads(_FIXTURE.read_text())["cases"]


@pytest.mark.parametrize("case", CASES, ids=[c["text"] for c in CASES])
def test_assess_text(case: dict) -> None:
    r = assess_text(case["text"])
    assert r.level == case["level"]
    assert r.codes == case["codes"]
    assert len(r.labels) == len(case["codes"])
