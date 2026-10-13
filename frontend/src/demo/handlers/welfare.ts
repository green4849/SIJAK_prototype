/**
 * 가까운 복지시설 (C7) · 두뇌 운동 — 백엔드 없음. 계약: shared/api/draft.ts
 * 복지시설은 공공데이터포털 '노인복지시설' 형식을 본뜬 시연 데이터 — 오산시 양산동 기준 (아래 CENTERS 설명).
 */
import { fail, json, type Route } from '../http'
import { db, save } from '../store'
import { requireUser } from './auth'
import type { BrainResultIn, BrainStatsOut, WelfareCenterOut, WelfareKind } from '@/shared/api/draft'

const KIND_LABEL: Record<WelfareKind, string> = {
  welfare_center: '노인복지관',
  senior_center: '시니어센터',
  kyungrodang: '경로당',
}

type Seed = Omit<WelfareCenterOut, 'kind_label'>

/*
 * 오산시 양산동(세마동 관할) 기준 — 실제 있는 단지·기관 이름을 빌려 '진짜 동네'처럼 보이게 한 시연 데이터.
 *  - 시설 이름·동네: 실제 (양산동 아파트 단지 경로당, 오산노인종합복지관, 오산시니어클럽)
 *  - 거리: 양산동 가운데(한신대 앞)에서 어림한 값
 *  - 프로그램·빈방·운영시간·전화번호: 시연용으로 지어낸 값 → 실제 기관에 확인하지 않음
 *    (전화번호는 실제 기관 번호가 아니다. 실서비스에서는 공공데이터포털 '노인복지시설' API 값을 쓴다)
 */
const CENTERS: Seed[] = [
  {
    id: 'w-1', name: '세마e편한세상 경로당', kind: 'kyungrodang', address: '경기도 오산시 양산동 세마e편한세상 단지 안',
    phone: '0312345001', distance_km: 0.3, open_hours: '매일 10시 ~ 17시',
    programs: [
      { id: 'p-1', title: '노래 교실', schedule_text: '매주 화·목 오후 2시', fee_text: '무료', seats_left: 3 },
      { id: 'p-2', title: '바둑·장기 한마당', schedule_text: '매일 오후', fee_text: '무료', seats_left: null },
      { id: 'p-3', title: '의자 요가', schedule_text: '매주 월 오전 11시', fee_text: '무료', seats_left: 4 },
    ],
    rooms: [{ name: '큰방', capacity: 15, available_text: '주말에 비어 있어요' }],
  },
  {
    id: 'w-2', name: '양산동 늘푸른오스카빌 경로당', kind: 'kyungrodang', address: '경기도 오산시 양산동 늘푸른오스카빌 단지 안',
    phone: '0312345003', distance_km: 0.5, open_hours: '매일 10시 ~ 17시',
    programs: [
      { id: 'p-4', title: '건강 걷기', schedule_text: '매주 토 오전 8시', fee_text: '무료', seats_left: null },
      { id: 'p-5', title: '스마트폰 기초반', schedule_text: '매주 수 오전 10시', fee_text: '무료', seats_left: 0 },
    ],
    rooms: [{ name: '작은방', capacity: 8, available_text: '평일 오전 비어 있어요' }],
  },
  {
    id: 'w-3', name: '오산세마 효성백년가약 경로당', kind: 'kyungrodang', address: '경기도 오산시 양산동 오산세마 효성백년가약 단지 안',
    phone: '0312345005', distance_km: 0.7, open_hours: '매일 10시 ~ 17시',
    programs: [{ id: 'p-6', title: '서예 교실', schedule_text: '매주 금 오후 1시', fee_text: '무료', seats_left: 5 }],
    rooms: [{ name: '큰방', capacity: 12, available_text: '평일 오후 비어 있어요' }],
  },
  {
    id: 'w-4', name: '오산노인종합복지관', kind: 'welfare_center', address: '경기도 오산시',
    phone: '0312345678', distance_km: 4, open_hours: '평일 9시 ~ 18시',
    programs: [
      { id: 'p-7', title: '건강 체조', schedule_text: '매일 오전 9시 30분', fee_text: '무료', seats_left: null },
      { id: 'p-8', title: '텃밭 가꾸기', schedule_text: '매주 화 오전 9시', fee_text: '무료', seats_left: 2 },
      { id: 'p-9', title: '치매 예방 교실', schedule_text: '매주 목 오전 10시', fee_text: '무료', seats_left: 1 },
      { id: 'p-10', title: '영화 보는 날', schedule_text: '매달 셋째 금 오후 2시', fee_text: '무료', seats_left: 20 },
    ],
    rooms: [
      { name: '1층 사랑방', capacity: 12, available_text: '평일 오후 비어 있어요' },
      { name: '강당', capacity: 40, available_text: '하루 전까지 전화로 예약' },
    ],
  },
  {
    id: 'w-5', name: '오산시니어클럽', kind: 'senior_center', address: '경기도 오산시 내삼미동',
    phone: '0312345002', distance_km: 4.5, open_hours: '평일 9시 ~ 18시',
    programs: [
      { id: 'p-11', title: '어르신 일자리 상담', schedule_text: '평일 상시', fee_text: '무료', seats_left: null },
      { id: 'p-12', title: '그림책 읽어 주기 봉사', schedule_text: '매주 목 오후 3시', fee_text: '무료', seats_left: 6 },
    ],
    rooms: [],
  },
]

const out = (c: Seed): WelfareCenterOut => ({ ...c, kind_label: KIND_LABEL[c.kind] })

// ---------- 두뇌 운동 ----------

const DAY = 86400_000
/** 브라우저 기준 날짜 (시드의 iso(-1, …) 도 브라우저 날짜 기준이라 맞춰 둔다) */
const dayKey = (t: number) => {
  const d = new Date(t)
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
}

function brainStats(uid: string): BrainStatsOut {
  const log = db().brain.filter((b) => b.uid === uid)
  const days = new Set(log.map((b) => dayKey(new Date(b.at).getTime())))
  const now = Date.now()
  const today = dayKey(now)
  // 연속 일수: 오늘 했으면 오늘부터, 아니면 어제부터 거꾸로
  let streak = 0
  for (let t = days.has(today) ? now : now - DAY; days.has(dayKey(t)); t -= DAY) streak++
  // 이번 주 월요일부터
  const mondayOffset = (new Date(now).getDay() + 6) % 7
  const week = Array.from({ length: 7 }, (_, i) => days.has(dayKey(now - (mondayOffset - i) * DAY)))
  const match = log.filter((b) => b.game === 'match').map((b) => b.score)
  const calc = log.filter((b) => b.game === 'calc')
  const best: BrainStatsOut['best'] = []
  if (match.length) best.push({ game: 'match', text: `가장 적게 뒤집은 횟수 ${Math.min(...match)}번` })
  if (calc.length) best.push({ game: 'calc', text: `가장 많이 맞힌 문제 ${Math.max(...calc.map((c) => c.score))}개` })
  return { streak_days: streak, today_done: days.has(today), week, best }
}

export const welfareRoutes: Route[] = [
  ['GET', '/welfare/nearby', (req) => {
    requireUser(req)
    const kind = req.query.get('kind')
    return json(CENTERS.filter((c) => !kind || kind === 'all' || c.kind === kind).map(out))
  }],

  ['GET', '/welfare/:id', (req) => {
    requireUser(req)
    const c = CENTERS.find((x) => x.id === req.params.id)
    return c ? json(out(c)) : fail(404, 'not_found', '없는 시설이에요.')
  }],

  ['GET', '/brain/stats', (req) => json(brainStats(requireUser(req).id))],

  ['POST', '/brain/results', (req) => {
    const me = requireUser(req)
    const b = req.body as BrainResultIn
    if (b?.game !== 'match' && b?.game !== 'calc') return fail(422, 'validation_error', '없는 게임이에요.')
    db().brain.push({ uid: me.id, game: b.game, score: b.score, total: b.total, at: new Date().toISOString() })
    save()
    return json(brainStats(me.id), 201)
  }],
]
