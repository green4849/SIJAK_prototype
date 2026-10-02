/**
 * 데모 서버 상태 — 백엔드 테이블을 단순화한 사본.
 * 탭(sessionStorage)마다 따로 저장 → 새로고침해도 유지, 다른 사람과는 섞이지 않음.
 * 음성 파일(Blob)은 메모리에만 둔다 (새로고침하면 재생 불가로 표시됨).
 */

export interface DUser {
  id: string
  name: string
  birth_date: string
  gender: 'M' | 'F'
  phone: string
  region_code: string
  interests: string[]
  intro: string
  has_location: boolean
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
  category: string
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
  seq: number
}

const KEY = 'wipi.demo.v1'
const VERSION = 2 // 시드 내용이 바뀌면 올린다 (열려 있던 탭도 새 시드로)
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
    interests: string[], intro: string, hasLoc = true,
  ): DUser => ({
    id, name, birth_date: birth, gender, phone, region_code: region, interests, intro,
    has_location: hasLoc, last_login: Date.now() - Math.random() * 86400_000,
  })

  const users: DUser[] = [
    user(DEMO_ME_ID, '김시작', '1956-04-12', 'M', '01055551234', '41',
      ['walking', 'health', 'gardening'], '좋은 벗들과 함께하는 행복한 일상!', false),
    user('u-sunja', '이순자', '1958-05-02', 'F', '01020000001', '41',
      ['walking', 'tv', 'travel'], '산책과 영화, 여행을 좋아해요. 같이 이야기 나눠요!'),
    user('u-jungho', '박정호', '1954-11-20', 'M', '01020000002', '41',
      ['walking', 'health', 'baduk'], '매일 아침 한강 걷기를 해요. 좋은 친구를 만나고 싶어요.'),
    user('u-younghee', '김영희', '1956-02-14', 'F', '01020000003', '41',
      ['cooking', 'gardening'], '요리와 텃밭 가꾸기를 좋아해요.'),
    user('u-malsoon', '최말순', '1952-08-08', 'F', '01020000004', '41',
      ['music', 'crafts', 'memories'], '옛날 노래 들으며 뜨개질해요.', false),
    user('u-deoksu', '정덕수', '1950-03-30', 'M', '01020000005', '41',
      ['baduk', 'reading', 'health'], '바둑 두실 분 찾아요.'),
    user('u-okja', '한옥자', '1957-12-01', 'F', '01020000006', '11',
      ['music', 'health'], '복지관 노래교실 다녀요.'),
    user('u-gicheol', '윤기철', '1953-06-17', 'M', '01020000007', '11',
      ['walking', 'travel'], '등산과 사진 찍기를 좋아합니다. 주말마다 가까운 산에 오르고, 찍은 꽃 사진을 손주들에게 보내 주는 게 낙이에요. 천천히 같이 걸으실 분 환영해요!', false),
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
    title: string, subtitle: string, category: string, region: string, place: string,
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
      '○○근린공원 (시작 광장)', 3, 10, 90, 20, 'walk',
      '우리 동네를 함께 걸으며 건강도 챙기고 이웃과 이야기 나누는 시간입니다. 편한 운동화와 물을 챙겨 오세요.', 12),
    // 긴 제목·장소 — 화면이 긴 내용에도 정렬을 유지하는지 확인용 (A15)
    act('스마트폰 활용 교육 (사진 보내기·영상통화 기초반)', '사진 보내기부터 영상통화까지 차근차근', 'learning', '41',
      '○○주민센터 2층 정보화 교육실 (엘리베이터 이용 가능)', 5, 14, 120, 12, 'phone',
      '카카오톡 사진 보내기, 영상통화, 버스 도착 시간 보기를 배워요. 휴대폰을 꼭 챙겨 오세요.', 9),
    act('동네 영화 상영회', '추억의 명작 영화를 함께 봐요', 'culture', '41',
      '○○문화회관 소극장', 8, 15, 150, 40, 'movie',
      '옛날 명작 영화를 큰 화면으로 함께 봐요. 상영 후 차 한 잔 하며 이야기 나눠요.', 21),
    act('전통 차 모임', '향긋한 차와 함께하는 담소', 'culture', '41',
      '○○복지관 1층 사랑방', 11, 10, 90, 15, 'tea',
      '제철 전통차를 우려 마시며 이웃과 이야기 나누는 시간이에요.', 6),
    act('노래 교실', '흘러간 옛 노래 함께 불러요', 'culture', '41',
      '○○복지관 강당', 2, 14, 90, 30, 'music', '트로트와 가곡을 함께 불러요. 목 풀기 체조로 시작해요.', 30),
    act('의자 요가', '앉아서 하는 쉬운 스트레칭', 'health', '41',
      '○○경로당', 4, 11, 60, 12, 'exercise', '무릎이 불편하셔도 괜찮아요. 의자에 앉아서 천천히 몸을 풀어요.', 4),
    act('텃밭 가꾸기', '상자 텃밭에 상추를 심어요', 'learning', '11',
      '○○구민 공동텃밭', 6, 9, 120, 15, 'garden', '흙을 만지며 상추와 깻잎을 심어요. 장갑은 준비해 드려요.', 7),
    act('그림책 읽기 모임', '손주에게 읽어 줄 그림책을 함께', 'learning', '11',
      '○○구립도서관', 9, 14, 90, 10, 'book', '손주에게 읽어 주기 좋은 그림책을 함께 읽고 이야기 나눠요.', 3),
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
