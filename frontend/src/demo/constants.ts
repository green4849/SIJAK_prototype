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

export const INTERESTS: Record<string, string> = {
  walking: '산책·등산',
  music: '노래·음악',
  cooking: '요리',
  gardening: '텃밭·꽃 가꾸기',
  baduk: '바둑·장기',
  travel: '여행',
  health: '건강·운동',
  tv: 'TV·드라마',
  reading: '책·신문',
  crafts: '뜨개질·만들기',
  faith: '종교 활동',
  memories: '옛날 이야기',
}

export const MAX_INTERESTS = 5
export const INTRO_MAX_LEN = 60
export const TEXT_MAX = 500

export const CATEGORIES: Record<string, string> = {
  culture: '문화·여가',
  health: '건강',
  learning: '배움',
}

export const REPORT_REASONS: Record<string, string> = {
  money: '돈을 요구해요',
  personal_info: '개인정보를 물어봐요',
  harassment: '불쾌한 말을 해요',
  spam: '광고·홍보를 해요',
  other: '기타',
}

/** 데모에서 '내 위치 사용하기'를 누르면 놓이는 자리 — 시드 이웃들이 사는 시연 동네 한가운데 */
export const DEMO_HOME: [number, number] = [37.27, 127.01]
