"""가입 시 선택지 (도메인 기준 데이터).

region_code: 행정표준코드 시·도 2자리. 컬럼은 VARCHAR(10)이라
추후 시·군·구 5자리로 확장해도 스키마 변경이 없다.
"""

REGIONS: dict[str, str] = {
    "11": "서울특별시",
    "26": "부산광역시",
    "27": "대구광역시",
    "28": "인천광역시",
    "29": "광주광역시",
    "30": "대전광역시",
    "31": "울산광역시",
    "36": "세종특별자치시",
    "41": "경기도",
    "43": "충청북도",
    "44": "충청남도",
    "46": "전라남도",
    "47": "경상북도",
    "48": "경상남도",
    "50": "제주특별자치도",
    "51": "강원특별자치도",
    "52": "전북특별자치도",
}

# 좋아하는 활동 — 가입·프로필·성향조사 Q1이 같은 목록을 쓴다 (매칭 H = 취미 유사도).
# 2026-11-24 성향조사 질문지(Q1)에 맞춰 13개 → 10개. 뜻이 같은 코드는 그대로 두고 이름만 바꿨다
# (cooking·reading·health·gardening). 빠진 코드의 기존 기록은 마이그레이션이 옮기거나 지운다
INTERESTS: dict[str, str] = {
    "walking": "산책·등산",
    "movies": "영화·공연",
    "cooking": "요리·맛집 탐방",
    "fishing": "낚시",
    "reading": "독서·문화생활",
    "finance": "경제·재테크",
    "travel": "여행",
    "health": "운동·건강관리",
    "gardening": "원예·식물 가꾸기",
    "volunteer": "봉사활동",
}

MAX_INTERESTS = 5

INTRO_MAX_LEN = 60

# 회원 탈퇴 (B3, 보고서 4.6.3) — 탈퇴하면 바로 로그인·노출을 멈추고,
# 이 날수 뒤 개인정보를 완전히 지운다
WITHDRAW_GRACE_DAYS = 30
WITHDRAW_REASON_MAX_LEN = 30

# 가입 동의 문서 (B6·B5). 본문은 frontend/src/shared/legal/documents.ts — 같은 버전을 쓴다.
# 본문을 바꾸면 버전을 올린다 → 필수 문서는 다음 접속 때 다시 동의를 받고,
# 선택 문서는 동의가 풀린다.
#   terms    서비스 이용약관
#   privacy  개인정보 수집·이용 (일반 개인정보)
#   location 위치기반서비스 이용약관 + 개인위치정보 수집·이용 (위치정보법)
#            — 동네 이웃 찾기에 꼭 필요해 필수
#   health   마음 건강 기록 (PHQ-9·GAD-7·WHO-5 — 개인정보 보호법 제23조 민감정보)
#            — 선택, 거부해도 가입 가능
# 2026-11-28: 운영 카카오 로그인과 직접 입력 정보에 맞춰 약관·동의 문구 수정
CONSENT_VERSION = "2026-11-28"
CONSENT_DOCS: dict[str, bool] = {  # 종류 → 필수 여부
    "terms": True,
    "privacy": True,
    "location": True,
    "health": False,
}
CONSENT_VERSIONS: dict[str, str] = {
    "terms": CONSENT_VERSION,
    "privacy": CONSENT_VERSION,
    "location": "2026-11-28",
    "health": "2026-11-26",
}
