/**
 * 데모 서버 상태 — 백엔드 테이블을 단순화한 사본.
 * 탭(sessionStorage)마다 따로 저장 → 새로고침해도 유지, 다른 사람과는 섞이지 않음.
 * 음성 파일(Blob)은 메모리에만 둔다 (새로고침하면 재생 불가로 표시됨).
 */

import type { Schema } from '@/shared/api/types'

type ActivityCategory = Schema<'ActivityOut'>['category']

/** 화면에 보일 사는 곳 — 동네 이름이 있으면 '오산시 세마동', 없으면 시·도 (데모 전용: 실서버는 시·도) */
export function regionLabel(u: { region_code: string; area?: string }, regions: Record<string, string>): string {
  return u.area ?? regions[u.region_code] ?? u.region_code
}

export interface DUser {
  id: string
  name: string
  birth_date: string
  gender: 'M' | 'F'
  phone: string
  region_code: string
  /** 동네 이름 (예: '오산시 세마동') — 위치 동의로 정한 동네. 없으면 시·도만 보인다 */
  area?: string
  interests: string[]
  intro: string
  /** 동의한 경우만, 백엔드처럼 소수점 2자리(≈1km)로 뭉갠 좌표 [위도, 경도] */
  geo: [number, number] | null
  last_login: number
}

export interface DFriendRequest {
  id: string
  from: string
  to: string
  status: 'pending' | 'accepted' | 'declined'
  at: number
}

export interface DRoom {
  id: string
  a: string
  b: string
  read: Record<string, number> // userId → 마지막으로 읽은 메시지 id
  last_at: string | null
}

export interface DMessage {
  id: number
  room: string
  sender: string
  kind: 'text' | 'voice'
  body: string
  duration_sec: number | null
  created_at: string
  risk_level: number
  risk_labels: string[]
}

export interface DActivity {
  id: string
  title: string
  subtitle: string
  category: ActivityCategory
  region_code: string
  place: string
  schedule_text: string
  starts_at: string
  ends_at: string
  capacity: number
  description: string
  image_kind: string
  base_applied: number // 다른 이웃들이 이미 신청한 수 (시연용)
}

/** point_entries 사본 (C12) — 잔액은 합계 */
export interface DPointEntry {
  id: number
  uid: string
  amount: number
  reason: 'welcome' | 'rating' | 'volunteer' | 'mission_first_friends' | 'friend_request'
  ref: string
  memo: string
  at: string
}

/** 말동무 대화 (C8, 백엔드 없음 — shared/api/draft.ts) */
export interface DCompanionMsg {
  id: number
  uid: string
  role: 'user' | 'assistant'
  text: string
  input_type: 'text' | 'voice'
  at: string
  suggestion: { activity_id: string; title: string; schedule_text: string } | null
  safety: 'medical' | 'crisis' | null
  /** 정서 분석 결과 (보고서 4.5.2 — 화면에는 안 보이고 마음 건강 화면이 쓴다) */
  emotion: 'joy' | 'neutral' | 'sadness' | 'anxiety' | null
}

/** 보호자 (C10, 백엔드 없음) */
export interface DGuardian {
  id: string
  uid: string
  name: string
  relation: string
  phone: string
}

/** 자가평가 결과 (C11, 백엔드 없음) */
export interface DAssessment {
  id: number
  uid: string
  kind: 'phq9' | 'gad7'
  answers: number[]
  at: string
}

/** 알림함 (백엔드 없음) */
export interface DNotification {
  id: string
  uid: string
  kind: 'friend' | 'activity' | 'safety' | 'wellbeing' | 'welfare' | 'points'
  title: string
  body: string
  at: string
  read: boolean
  link: string | null
}

/** 운영자 화면 사건 (B7, 백엔드 없음) */
export interface DAdminCase {
  id: string
  source: 'report' | 'auto'
  target_id: string
  target_name: string
  reasons: string[]
  excerpt: string | null
  level: number
  reports_count: number
  at: string
  status: 'open' | 'warned' | 'suspended' | 'banned' | 'dismissed'
}

export interface DemoState {
  version: number
  me: string | null // 로그인한 사용자 id
  users: DUser[]
  requests: DFriendRequest[]
  rooms: DRoom[]
  messages: DMessage[]
  blocks: { blocker: string; blocked: string }[]
  reports: { reporter: string; target: string; reason: string }[]
  activities: DActivity[]
  applications: { aid: string; uid: string }[]
  likes: { aid: string; uid: string }[]
  // C12
  points: DPointEntry[]
  ratings: { uid: string; target: string; rating: 'like' | 'neutral' | 'dislike' }[]
  notif: Record<string, { enabled: boolean; times: ('morning' | 'noon' | 'evening')[] }>
  // C8 — 화면·데모만 (백엔드 없음)
  companion: DCompanionMsg[]
  /** 말로 하기(받아쓰기 흉내) 다음 순서 */
  companionVoiceTurn: number
  // C10·C11 — 화면·데모만
  guardians: DGuardian[]
  assessments: DAssessment[]
  sos: { id: string; uid: string; at: string }[]
  /** 지난 3주 사회적 관계 지수 (이번 주는 활동으로 계산) */
  relationHistory: Record<string, number[]>
  // 인지 훈련 — 화면·데모만
  brain: { uid: string; game: 'match' | 'calc'; score: number; total: number; at: string }[]
  // 알림함·탈퇴·운영자 화면 — 화면·데모만
  notifications: DNotification[]
  withdrawn: Record<string, string> // uid → 완전 삭제 예정일
  adminCases: DAdminCase[]
  /** 데모 안에서 들어온 신고(reports 순번)의 처리 상태 */
  reportStatus: Record<number, DAdminCase['status']>
  seq: number
}

const KEY = 'wipi.demo.v1'
const VERSION = 10 // 시드 내용이 바뀌면 올린다 (열려 있던 탭도 새 시드로) — 4: C12 포인트·봉사, 5: C8 말동무, 6: C10·C11, 7: 복지시설·두뇌 운동, 8: 알림함·탈퇴·운영자, 9: 오산시 양산동 기준 동네·장소, 10: 고립 지수 → 사회적 관계 지수(뒤집음)
export const DEMO_ME_ID = 'u-me'

const uid = () => crypto.randomUUID()
export const newId = uid

// ---------- 시드 ----------

function iso(daysFromToday: number, hourKst: number, minute = 0): string {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + daysFromToday)
  // 브라우저 시간대와 무관하게 '한국 시각 hour시'로 맞춘다
  const utc = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), hourKst - 9, minute)
  return new Date(utc).toISOString()
}

function scheduleText(isoStr: string) {
  const d = new Date(new Date(isoStr).getTime() + 9 * 3600_000) // KST
  const h = d.getUTCHours()
  const days = '일월화수목금토'
  return `${d.getUTCMonth() + 1}월 ${d.getUTCDate()}일 (${days[d.getUTCDay()]}) ${h < 12 ? '오전' : '오후'} ${h % 12 || 12}시`
}

function seed(): DemoState {
  const user = (
    id: string, name: string, birth: string, gender: 'M' | 'F', phone: string, region: string,
    interests: string[], intro: string, geo: [number, number] | null, area?: string,
  ): DUser => ({
    id, name, birth_date: birth, gender, phone, region_code: region, area, interests, intro,
    geo, last_login: Date.now() - Math.random() * 86400_000,
  })

  const users: DUser[] = [
    user(DEMO_ME_ID, '김시작', '1956-04-12', 'M', '01055551234', '41',
      ['walking', 'health', 'gardening'], '좋은 벗들과 함께하는 행복한 일상!', null, '오산시 세마동'),
    user('u-sunja', '이순자', '1958-05-02', 'F', '01020000001', '41',
      ['walking', 'tv', 'travel'], '산책과 영화, 여행을 좋아해요. 같이 이야기 나눠요!', [37.193, 127.024], '오산시 세마동'),
    user('u-jungho', '박정호', '1954-11-20', 'M', '01020000002', '41',
      ['walking', 'health', 'baduk'], '매일 아침 오산천 걷기를 해요. 좋은 친구를 만나고 싶어요.', [37.203, 127.034], '오산시 세마동'),
    user('u-younghee', '김영희', '1956-02-14', 'F', '01020000003', '41',
      ['cooking', 'gardening'], '요리와 텃밭 가꾸기를 좋아해요.', [37.183, 127.014], '오산시 세마동'),
    user('u-malsoon', '최말순', '1952-08-08', 'F', '01020000004', '41',
      ['music', 'crafts', 'memories'], '옛날 노래 들으며 뜨개질해요.', null, '오산시 세마동'),
    user('u-deoksu', '정덕수', '1950-03-30', 'M', '01020000005', '41',
      ['baduk', 'reading', 'health'], '바둑 두실 분 찾아요.', [37.213, 127.044], '화성시 병점동'),
    user('u-okja', '한옥자', '1957-12-01', 'F', '01020000006', '11',
      ['music', 'health'], '복지관 노래교실 다녀요.', [37.57, 126.98]),
    user('u-gicheol', '윤기철', '1953-06-17', 'M', '01020000007', '11',
      ['walking', 'travel'], '등산과 사진 찍기를 좋아합니다. 주말마다 가까운 산에 오르고, 찍은 꽃 사진을 손주들에게 보내 주는 게 낙이에요. 천천히 같이 걸으실 분 환영해요!', null),
  ]

  const now = Date.now()
  const requests: DFriendRequest[] = [
    { id: uid(), from: DEMO_ME_ID, to: 'u-sunja', status: 'accepted', at: now - 3 * 86400_000 },
    { id: uid(), from: 'u-deoksu', to: DEMO_ME_ID, status: 'accepted', at: now - 2 * 86400_000 },
    // 받은 신청 하나 — '수락하기' 시연용
    { id: uid(), from: 'u-jungho', to: DEMO_ME_ID, status: 'pending', at: now - 3600_000 },
  ]

  const roomSunja: DRoom = { id: uid(), a: DEMO_ME_ID, b: 'u-sunja', read: {}, last_at: null }
  const roomDeoksu: DRoom = { id: uid(), a: DEMO_ME_ID, b: 'u-deoksu', read: {}, last_at: null }
  let seq = 0
  const msg = (room: DRoom, sender: string, body: string, at: string, risk?: [number, string[]]): DMessage => {
    room.last_at = at
    return {
      id: ++seq, room: room.id, sender, kind: 'text', body, duration_sec: null, created_at: at,
      risk_level: risk?.[0] ?? 0, risk_labels: risk?.[1] ?? [],
    }
  }
  const messages: DMessage[] = [
    // 시안 ⑤ 대화
    msg(roomSunja, 'u-sunja', '안녕하세요!\n저도 같은 동네에 살아요.\n만나서 반갑습니다. 😊', iso(-1, 10, 15)),
    msg(roomSunja, DEMO_ME_ID, '네! 반갑습니다.\n혹시 이번 주 걷기 모임에 같이 가실래요?', iso(-1, 10, 17)),
    msg(roomSunja, 'u-sunja', '좋아요! 저도 가고 싶었어요.\n함께해요! 😊', iso(-1, 10, 18)),
    // 위험 대화 경고 시연용
    msg(roomDeoksu, 'u-deoksu', '바둑 한 판 두러 오세요!', iso(-1, 15, 0)),
    msg(roomDeoksu, 'u-deoksu', '그런데 제가 급해서 그러는데 병원비 때문에 계좌로 송금 좀 해 줄 수 있어요?',
      iso(0, 9, 30), [3, ['돈·송금 이야기', '급하게 서두르게 하는 말']]),
  ]
  roomSunja.read = { [DEMO_ME_ID]: 3, 'u-sunja': 3 }
  roomDeoksu.read = { [DEMO_ME_ID]: 4, 'u-deoksu': 5 }

  const act = (
    title: string, subtitle: string, category: ActivityCategory, region: string, place: string,
    days: number, hour: number, minutes: number, capacity: number, image: string,
    description: string, applied: number,
  ): DActivity => {
    const starts = iso(days, hour)
    return {
      id: uid(), title, subtitle, category, region_code: region, place,
      schedule_text: scheduleText(starts), starts_at: starts,
      ends_at: new Date(new Date(starts).getTime() + minutes * 60_000).toISOString(),
      capacity, description, image_kind: image, base_applied: applied,
    }
  }
  const activities = [
    act('건강 걷기 모임', '함께 걸으며 건강도 챙기고 좋은 이웃도 만나요!', 'health', '41',
      '오산천 산책로 입구', 3, 10, 90, 20, 'walk',
      '우리 동네를 함께 걸으며 건강도 챙기고 이웃과 이야기 나누는 시간입니다. 편한 운동화와 물을 챙겨 오세요.', 12),
    // 긴 제목·장소 — 화면이 긴 내용에도 정렬을 유지하는지 확인용 (A15)
    act('스마트폰 활용 교육 (사진 보내기·영상통화 기초반)', '사진 보내기부터 영상통화까지 차근차근', 'learning', '41',
      '세마동 행정복지센터 2층 프로그램실 (엘리베이터 이용 가능)', 5, 14, 120, 12, 'phone',
      '카카오톡 사진 보내기, 영상통화, 버스 도착 시간 보기를 배워요. 휴대폰을 꼭 챙겨 오세요.', 9),
    act('동네 영화 상영회', '추억의 명작 영화를 함께 봐요', 'culture', '41',
      '오산문화예술회관 소공연장', 8, 15, 150, 40, 'movie',
      '옛날 명작 영화를 큰 화면으로 함께 봐요. 상영 후 차 한 잔 하며 이야기 나눠요.', 21),
    act('전통 차 모임', '향긋한 차와 함께하는 담소', 'culture', '41',
      '오산노인종합복지관 1층 사랑방', 11, 10, 90, 15, 'tea',
      '제철 전통차를 우려 마시며 이웃과 이야기 나누는 시간이에요.', 6),
    act('노래 교실', '흘러간 옛 노래 함께 불러요', 'culture', '41',
      '오산노인종합복지관 강당', 2, 14, 90, 30, 'music', '트로트와 가곡을 함께 불러요. 목 풀기 체조로 시작해요.', 30),
    act('의자 요가', '앉아서 하는 쉬운 스트레칭', 'health', '41',
      '세마e편한세상 경로당', 4, 11, 60, 12, 'exercise', '무릎이 불편하셔도 괜찮아요. 의자에 앉아서 천천히 몸을 풀어요.', 4),
    act('텃밭 가꾸기', '상자 텃밭에 상추를 심어요', 'learning', '11',
      '○○구민 공동텃밭', 6, 9, 120, 15, 'garden', '흙을 만지며 상추와 깻잎을 심어요. 장갑은 준비해 드려요.', 7),
    act('그림책 읽기 모임', '손주에게 읽어 줄 그림책을 함께', 'learning', '11',
      '○○구립도서관', 9, 14, 90, 10, 'book', '손주에게 읽어 주기 좋은 그림책을 함께 읽고 이야기 나눠요.', 3),
    // 봉사 (C12) — backend/scripts/seed.py 와 같은 내용
    act('어르신 도시락 나눔', '복지관과 함께 이웃에게 도시락을 전해요', 'volunteer', '41',
      '오산노인종합복지관 1층 식당', 4, 10, 120, 15, 'meal',
      '복지관에서 만든 도시락을 포장해 홀로 사시는 이웃께 전해 드려요. 무거운 짐은 복지관 선생님이 맡아요. 앞치마는 복지관에서 드려요.', 11),
    act('공원 걷기 + 쓰레기 줍기', '걸으면서 우리 동네도 깨끗하게', 'volunteer', '41',
      '오산천 산책로 입구', 8, 15, 60, 20, 'cleanup',
      '천천히 공원을 걸으며 쓰레기를 주워요. 집게와 장갑은 복지관에서 준비해요.', 6),
  ]

  // 포인트 (C12): 가입 보너스 → 이순자님께 첫 신청(무료) → 어제 추천 평가 한 번 = 110P
  // (유료 신청 세 번이면 20P 남음 → 네 번째에 '포인트가 조금 부족해요' 시연)
  const pt = (amount: number, reason: DPointEntry['reason'], ref: string, memo: string, at: string): DPointEntry => ({
    id: ++seq, uid: DEMO_ME_ID, amount, reason, ref, memo, at,
  })
  const points: DPointEntry[] = [
    pt(100, 'welcome', 'welcome', '', new Date(now - 4 * 86400_000).toISOString()),
    pt(0, 'friend_request', 'friend_request:u-sunja', '이순자님께 친구 신청', new Date(now - 3 * 86400_000).toISOString()),
    pt(10, 'rating', 'rating:u-gicheol', '윤기철님 평가', iso(-1, 19, 5)),
  ]

  // 말동무 (C8): 어제 저녁 이야기 + 오늘 아침 먼저 건넨 인사
  const cm = (
    role: DCompanionMsg['role'], text: string, at: string,
    extra: Partial<Pick<DCompanionMsg, 'input_type' | 'emotion'>> = {},
  ): DCompanionMsg => ({
    id: ++seq, uid: DEMO_ME_ID, role, text, at, input_type: extra.input_type ?? 'text',
    suggestion: null, safety: null, emotion: extra.emotion ?? null,
  })
  const companion: DCompanionMsg[] = [
    cm('assistant', '김시작님, 저녁은 드셨어요?', iso(-1, 19, 2)),
    cm('user', '응 된장찌개 먹었어', iso(-1, 19, 4), { input_type: 'voice', emotion: 'neutral' }),
    cm('assistant', '된장찌개 좋네요! 텃밭에서 키운 채소도 넣으셨어요?', iso(-1, 19, 4)),
    cm('user', '그럼 상추도 땄지. 올해는 잘 자랐어', iso(-1, 19, 6), { emotion: 'joy' }),
    cm('assistant', '와, 정성껏 가꾸신 보람이 있네요. 내일도 텃밭 이야기 들려주세요.', iso(-1, 19, 6)),
    cm('assistant', '좋은 아침이에요! 오늘은 무엇을 하실 계획이에요?', iso(0, 8, 30)),
  ]

  // 마음 건강 (C11): 2주 전 기분 점검, 지난주 걱정 점검
  const assessments: DAssessment[] = [
    { id: ++seq, uid: DEMO_ME_ID, kind: 'phq9', answers: [1, 1, 1, 1, 0, 1, 0, 0, 0], at: iso(-14, 10) },
    { id: ++seq, uid: DEMO_ME_ID, kind: 'gad7', answers: [1, 0, 1, 0, 0, 1, 0], at: iso(-7, 10) },
  ]

  // 알림함: 안 읽은 소식 셋 + 읽은 소식 셋
  const note = (
    kind: DNotification['kind'], title: string, body: string, at: string, read: boolean, link: string | null,
  ): DNotification => ({ id: uid(), uid: DEMO_ME_ID, kind, title, body, at, read, link })
  const notifications: DNotification[] = [
    note('safety', '조심하세요', '정덕수님 메시지에 돈·송금 이야기가 있어요', iso(0, 9, 31), false, `/chats/${roomDeoksu.id}`),
    note('friend', '새 친구 신청', '박정호님이 친구 신청을 보냈어요', new Date(now - 3600_000).toISOString(), false, '/friends'),
    note('activity', '신청한 활동', `건강 걷기 모임 · ${activities[0].schedule_text}`, iso(0, 8, 0), false, `/activities/${activities[0].id}`),
    note('wellbeing', '이번 주 마음 날씨', '지난주보다 좋아졌어요', iso(-1, 9, 0), true, '/me/wellbeing'),
    note('welfare', '세마e편한세상 경로당', '노래 교실 자리가 3개 남았어요', iso(-2, 14, 0), true, '/welfare/w-1'),
    note('points', '포인트 +10P', '윤기철님 평가', iso(-1, 19, 5), true, '/me/points'),
  ]

  // 운영자 화면: 자동 감지 1 + 신고 2 (그중 하나는 처리됨)
  const adminCases: DAdminCase[] = [
    {
      id: uid(), source: 'auto', target_id: 'u-deoksu', target_name: '정덕수', reasons: ['돈·송금 이야기', '급하게 서두르게 하는 말'],
      excerpt: '병원비 때문에 계좌로 송금 좀 해 줄 수 있어요?', level: 3, reports_count: 0, at: iso(0, 9, 30), status: 'open',
    },
    {
      id: uid(), source: 'report', target_id: 'u-x1', target_name: '최강수', reasons: ['개인정보를 물어봐요'],
      excerpt: '문자로 온 인증번호 좀 불러 주세요', level: 3, reports_count: 2, at: iso(-1, 16, 20), status: 'open',
    },
    {
      id: uid(), source: 'report', target_id: 'u-x2', target_name: '김철수', reasons: ['광고·홍보를 해요'],
      excerpt: '건강식품 싸게 드려요. 연락 주세요', level: 1, reports_count: 1, at: iso(-2, 11, 5), status: 'warned',
    },
  ]

  return {
    version: VERSION,
    me: null,
    users,
    requests,
    rooms: [roomSunja, roomDeoksu],
    messages,
    blocks: [],
    reports: [],
    activities,
    applications: [{ aid: activities[0].id, uid: DEMO_ME_ID }],
    likes: [activities[0].id, activities[2].id].map((aid) => ({ aid, uid: DEMO_ME_ID })),
    points,
    ratings: [{ uid: DEMO_ME_ID, target: 'u-gicheol', rating: 'neutral' }],
    notif: {},
    companion,
    companionVoiceTurn: 0,
    guardians: [
      { id: uid(), uid: DEMO_ME_ID, name: '김민수', relation: '아들', phone: '01098765432' },
      { id: uid(), uid: DEMO_ME_ID, name: '박선희', relation: '담당 복지사', phone: '0312345678' },
    ],
    assessments,
    sos: [],
    // 친구가 생기면서 조금씩 나아지는 흐름 (3주 전 → 지난주)
    relationHistory: { [DEMO_ME_ID]: [42, 49, 56] },
    // 두뇌 운동: 어제까지 사흘 연속 (오늘은 아직 — '오늘 하기' 시연)
    brain: [
      { uid: DEMO_ME_ID, game: 'calc', score: 4, total: 5, at: iso(-3, 9) },
      { uid: DEMO_ME_ID, game: 'match', score: 14, total: 4, at: iso(-2, 9) },
      { uid: DEMO_ME_ID, game: 'calc', score: 5, total: 5, at: iso(-1, 9) },
    ],
    notifications,
    withdrawn: {},
    adminCases,
    reportStatus: {},
    seq,
  }
}

// ---------- 저장 ----------

let state: DemoState | null = null
export const voiceBlobs = new Map<number, Blob>()

export function db(): DemoState {
  if (state) return state
  try {
    const raw = sessionStorage.getItem(KEY)
    const parsed = raw ? (JSON.parse(raw) as DemoState) : null
    state = parsed?.version === VERSION ? parsed : seed()
  } catch {
    state = seed()
  }
  return state
}

export function save() {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(db()))
  } catch {
    // 저장 못 해도 이번 화면에서는 동작
  }
}

export function reset() {
  state = seed()
  voiceBlobs.clear()
  save()
}

// ---------- 공용 조회 ----------

export const userById = (id: string) => db().users.find((u) => u.id === id)

export function ageOf(birth: string): number {
  const b = new Date(birth)
  const t = new Date()
  return t.getFullYear() - b.getFullYear() - (t < new Date(t.getFullYear(), b.getMonth(), b.getDate()) ? 1 : 0)
}

export function relatedBlocks(userId: string): Set<string> {
  const out = new Set<string>()
  for (const b of db().blocks) {
    if (b.blocker === userId) out.add(b.blocked)
    if (b.blocked === userId) out.add(b.blocker)
  }
  return out
}
