"""대화 주제 추천 (C12) — 1단계: 관심사별 문구 규칙.

두 사람의 관심사로 첫마디·이어갈 말을 고른다.
화면은 누르면 입력칸에 넣기만 하고, 보내는 건 사람이 한다.
2단계(최근 대화 흐름을 보고 LLM이 문구 생성)는
`suggest()` 안을 `integrations/llm` 호출로 바꾸면 된다
— docs/deferred.md §6.
"""

from dataclasses import dataclass

from app.domains.auth.constants import INTERESTS

# 관심사 키(auth.constants.INTERESTS) → 문구 (어르신 말투, 짧게, 질문으로 끝나게)
PHRASES: dict[str, list[str]] = {
    "walking": ["자주 가시는 산책길이 있으세요?", "날 좋은 날 같이 천천히 걸으실래요?"],
    "movies": ["요즘 재미있게 보신 영화가 있으세요?", "다음에 공연 같이 보러 가실래요?"],
    "cooking": ["요즘 자주 해 드시는 음식이 있으세요?", "동네에 맛있는 집 아시는 데 있으세요?"],
    "fishing": ["낚시는 주로 어디로 가세요?", "제일 크게 잡으신 게 뭐였어요?"],
    "reading": ["요즘 읽고 계신 책이 있으세요?", "신문은 어떤 걸 보세요?"],
    "finance": ["요즘 경제 소식 중에 눈여겨보시는 게 있으세요?", "용돈 관리는 어떻게 하세요?"],
    "travel": ["가 보신 곳 중에 제일 좋았던 데가 어디세요?", "가까운 데 바람 쐬러 가실래요?"],
    "health": ["요즘 건강 챙기시려고 하시는 운동 있으세요?", "아침에 체조 같은 거 하세요?"],
    "gardening": ["요즘 키우시는 꽃이나 화분이 있으세요?", "텃밭에 뭐 심으셨어요?"],
    "volunteer": ["봉사는 주로 어디서 하세요?", "다음에 봉사 같이 가 보실래요?"],
}

GENERAL = [
    "오늘 점심은 뭐 드셨어요?",
    "이번 주 날씨가 좋다던데, 어떻게 지내세요?",
    "요즘 즐거운 일 있으셨어요?",
]

MAX_TOPICS = 4


@dataclass(frozen=True)
class Topic:
    #: 무엇에 관한 말인지 — 공통 관심사면 그 이름, 아니면 "일상"
    label: str
    text: str
    #: 두 사람 모두의 관심사에서 나온 문구인지 (화면: '두 분 다 ○○을 좋아하세요')
    common: bool


def suggest(my_interests: list[str], their_interests: list[str]) -> list[Topic]:
    """공통 관심사 → 상대 관심사 → 일상 순으로 최대 MAX_TOPICS개.

    관심사마다 첫 문구를 먼저 돌고, 그다음 둘째 문구를 돈다.
    """
    common = [c for c in their_interests if c in my_interests]
    theirs_only = [c for c in their_interests if c not in my_interests]
    out: list[Topic] = []
    for round_ in range(2):
        for cats, is_common in ((common, True), (theirs_only, False)):
            for c in cats:
                phrases = PHRASES.get(c, [])
                if round_ < len(phrases):
                    out.append(Topic(INTERESTS.get(c, c), phrases[round_], is_common))
    out += [Topic("일상", t, False) for t in GENERAL]
    return out[:MAX_TOPICS]
