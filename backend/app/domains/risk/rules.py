"""위험 대화 1단계: 키워드 룰 (보고서 4.6.2 Stage 1).

2·3단계(KoBERT 분류기, 대화 흐름 분석)는 비워 둠 — docs/deferred.md §3.
순수 함수만 둔다 (DB·HTTP 의존 없음) → 단위 테스트로 검증.
"""

import re
from dataclasses import dataclass, field

# (분류, 사용자에게 보여 줄 설명, 위험도 1~3, 패턴들)
RULES: list[tuple[str, str, int, list[str]]] = [
    (
        "money",
        "돈·송금 이야기",
        2,
        [
            r"송금",
            r"계좌",
            r"이체",
            r"입금",
            r"돈\s*(좀|을|이)?\s*(빌려|보내|부쳐)",
            r"빌려\s*줘",
            r"대출",
            r"투자",
            r"수익",
            r"코인",
            r"상품권",
            r"기프트\s*카드",
            r"선물\s*카드",
        ],
    ),
    (
        "personal_info",
        "비밀번호·인증번호 같은 개인정보",
        3,
        [
            r"비밀\s*번호",
            r"\bOTP\b",
            r"인증\s*번호",
            r"주민\s*(등록)?\s*번호",
            r"카드\s*번호",
            r"보안\s*카드",
            r"공인\s*인증서",
            r"신분증\s*(사진|찍어)",
        ],
    ),
    (
        "urgency",
        "급하게 서두르게 하는 말",
        1,
        [r"급해", r"긴급", r"지금\s*당장", r"병원비", r"사고\s*(났|가)", r"아무한테도\s*말하지"],
    ),
    (
        "off_platform",
        "다른 앱이나 링크로 옮기자는 말",
        1,
        [r"카톡\s*(아이디|ID)", r"텔레그램", r"라인\s*아이디", r"https?://", r"\bbit\.ly\b"],
    ),
]

_COMPILED = [
    (code, label, lvl, [re.compile(p, re.IGNORECASE) for p in pats])
    for code, label, lvl, pats in RULES
]


@dataclass(frozen=True)
class Assessment:
    level: int  # 0 안전, 1 주의, 2 경고, 3 위험
    codes: list[str] = field(default_factory=list)
    labels: list[str] = field(default_factory=list)

    @property
    def flagged(self) -> bool:
        return self.level > 0


def assess_text(text: str) -> Assessment:
    codes, labels, level = [], [], 0
    for code, label, lvl, patterns in _COMPILED:
        if any(p.search(text) for p in patterns):
            codes.append(code)
            labels.append(label)
            level = max(level, lvl)
    # 돈 이야기 + 서두르기가 같이 나오면 전형적인 사기 패턴 → 한 단계 올림
    if "money" in codes and "urgency" in codes:
        level = min(3, level + 1)
    return Assessment(level, codes, labels)
