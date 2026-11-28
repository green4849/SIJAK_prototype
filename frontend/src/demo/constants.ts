/** backend 도메인의 constants·models 와 같은 값 (데모 서버용 사본) */

export const REGIONS: Record<string, string> = {
  '11': '서울특별시',
  '26': '부산광역시',
  '27': '대구광역시',
  '28': '인천광역시',
  '29': '광주광역시',
  '30': '대전광역시',
  '31': '울산광역시',
  '36': '세종특별자치시',
  '41': '경기도',
  '43': '충청북도',
  '44': '충청남도',
  '46': '전라남도',
  '47': '경상북도',
  '48': '경상남도',
  '50': '제주특별자치도',
  '51': '강원특별자치도',
  '52': '전북특별자치도',
}

/** 좋아하는 활동 = 성향조사 Q1 (2026-11-24, 13개 → 10개) — backend auth/constants.py */
export const INTERESTS: Record<string, string> = {
  walking: '산책·등산',
  movies: '영화·공연',
  cooking: '요리·맛집 탐방',
  fishing: '낚시',
  reading: '독서·문화생활',
  finance: '경제·재테크',
  travel: '여행',
  health: '운동·건강관리',
  gardening: '원예·식물 가꾸기',
  volunteer: '봉사활동',
}

export const MAX_INTERESTS = 5
export const INTRO_MAX_LEN = 60

/** 가입 동의 문서 (B6) — backend auth/constants.py CONSENT_DOCS(필수 여부)·CONSENT_VERSIONS */
export const CONSENT_DOCS: Record<string, boolean> = { terms: true, privacy: true, location: true, health: false }
export const CONSENT_VERSIONS: Record<string, string> = {
  terms: '2026-11-28',
  privacy: '2026-11-28',
  location: '2026-11-28',
  health: '2026-11-26',
}
export const TEXT_MAX = 500

export const CATEGORIES: Record<string, string> = {
  culture: '문화·여가',
  health: '건강',
  learning: '배움',
  volunteer: '봉사',
}

// ---------- C12 — backend/app/domains/point/service.py 와 같은 값 ----------
export const POINTS = {
  welcome: 100,
  rating: 10,
  ratingDailyLimit: 5,
  volunteer: 100,
  firstFriends: 500,
  friendRequest: 30,
}
export const REWARD_CATEGORIES = new Set(['volunteer'])
export const POINT_REASONS: Record<string, string> = {
  welcome: '가입 축하',
  rating: '추천에 답하기',
  volunteer: '봉사 활동 참여',
  mission_first_friends: '첫 친구 3명 사귀기',
  friend_request: '친구 신청',
}
// backend/app/domains/notification/models.py
export const TIME_SLOTS: Record<string, string> = { morning: '아침 9시', noon: '점심 1시', evening: '저녁 7시' }
export const NOTIF_MAX_PER_DAY = 2

export const REPORT_REASONS: Record<string, string> = {
  money: '돈을 요구해요',
  personal_info: '개인정보를 물어봐요',
  harassment: '불쾌한 말을 해요',
  spam: '광고·홍보를 해요',
  other: '기타',
}

/** 데모에서 '내 위치 사용하기'를 누르면 놓이는 자리 — 시드 이웃들이 사는 시연 동네(오산시 양산동, 한신대 앞) 한가운데 */
export const DEMO_HOME: [number, number] = [37.193, 127.024]
