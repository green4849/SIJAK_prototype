/**
 * 가까운 복지시설 (C7) · 두뇌 운동 — 백엔드 없음. 계약: shared/api/draft.ts
 * 복지시설은 공공데이터포털 '노인복지시설' 형식을 본뜬 시연용 가상 시설 (실제 기관 아님).
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

const CENTERS: Seed[] = [
  {
    id: 'w-1', name: '○○노인종합복지관', kind: 'welfare_center', address: '○○시 ○○로 120', phone: '0312345678',
    distance_km: 0.5, open_hours: '평일 9시 ~ 18시',
    programs: [
      { id: 'p-1', title: '노래 교실', schedule_text: '매주 화·목 오후 2시', fee_text: '무료', seats_left: 3 },
      { id: 'p-2', title: '스마트폰 기초반', schedule_text: '매주 수 오전 10시', fee_text: '무료', seats_left: 0 },
      { id: 'p-3', title: '건강 체조', schedule_text: '매일 오전 9시 30분', fee_text: '무료', seats_left: null },
      { id: 'p-4', title: '서예 교실', schedule_text: '매주 금 오후 1시', fee_text: '월 1만 원', seats_left: 5 },
    ],
    rooms: [
      { name: '1층 사랑방', capacity: 12, available_text: '평일 오후 비어 있어요' },
      { name: '3층 소강당', capacity: 40, available_text: '하루 전까지 전화로 예약' },
    ],
  },
  {
    id: 'w-2', name: '○○동 경로당', kind: 'kyungrodang', address: '○○시 ○○동 34-2', phone: '0312345001',
    distance_km: 0.5, open_hours: '매일 10시 ~ 17시',
    programs: [
      { id: 'p-5', title: '바둑·장기 한마당', schedule_text: '매일 오후', fee_text: '무료', seats_left: null },
      { id: 'p-6', title: '의자 요가', schedule_text: '매주 월 오전 11시', fee_text: '무료', seats_left: 4 },
    ],
    rooms: [{ name: '큰방', capacity: 15, available_text: '주말에 비어 있어요' }],
  },
  {
    id: 'w-3', name: '○○시니어클럽', kind: 'senior_center', address: '○○시 ○○대로 88, 2층', phone: '0312345002',
    distance_km: 1, open_hours: '평일 9시 ~ 18시',
    programs: [
      { id: 'p-7', title: '어르신 일자리 상담', schedule_text: '평일 상시', fee_text: '무료', seats_left: null },
      { id: 'p-8', title: '그림책 읽어 주기 봉사', schedule_text: '매주 목 오후 3시', fee_text: '무료', seats_left: 6 },
    ],
    rooms: [],
  },
  {
    id: 'w-4', name: '△△경로당', kind: 'kyungrodang', address: '○○시 △△동 7', phone: '0312345003',
    distance_km: 1.5, open_hours: '매일 10시 ~ 17시',
    programs: [{ id: 'p-9', title: '건강 걷기', schedule_text: '매주 토 오전 8시', fee_text: '무료', seats_left: null }],
    rooms: [{ name: '작은방', capacity: 8, available_text: '평일 오전 비어 있어요' }],
  },
  {
    id: 'w-5', name: '△△노인복지관', kind: 'welfare_center', address: '○○시 △△로 15', phone: '0312345004',
    distance_km: 2.5, open_hours: '평일 9시 ~ 18시, 토 9시 ~ 13시',
    programs: [
      { id: 'p-10', title: '텃밭 가꾸기', schedule_text: '매주 화 오전 9시', fee_text: '무료', seats_left: 2 },
      { id: 'p-11', title: '영화 보는 날', schedule_text: '매달 셋째 금 오후 2시', fee_text: '무료', seats_left: 20 },
      { id: 'p-12', title: '치매 예방 교실', schedule_text: '매주 목 오전 10시', fee_text: '무료', seats_left: 1 },
    ],
    rooms: [{ name: '2층 동아리방', capacity: 20, available_text: '평일 오후 비어 있어요' }],
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
