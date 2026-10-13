/**
 * 시설까지 가는 길·여는 시간을 어르신에게 와닿는 말로 (C7 다듬기)
 *  - 거리: 미터보다 '걸어서 몇 분'
 *  - 여는 시간: 지금 열려 있는지, 아니면 언제 여는지
 */

/** 어르신 걸음 — 분당 약 50m (일반 성인 67m보다 느리게 잡음) */
const WALK_M_PER_MIN = 50
/** 이보다 멀면 걸어서 몇 분 대신 거리로 */
const WALK_MAX_KM = 1.5

export const distanceText = (km: number) => (km < 1 ? `${Math.round(km * 1000)}m` : `${km}km`)

/** "걸어서 6분" 또는 (멀면) "4km" */
export function walkText(km: number) {
  if (km > WALK_MAX_KM) return distanceText(km)
  return `걸어서 ${Math.max(1, Math.ceil((km * 1000) / WALK_M_PER_MIN))}분`
}

// ---------- 여는 시간 ----------

interface Slot {
  days: number[] // 0=일 … 6=토
  open: number // 분 (0시 기준)
  close: number
}

const DAY_WORDS: Record<string, number[]> = {
  매일: [0, 1, 2, 3, 4, 5, 6],
  평일: [1, 2, 3, 4, 5],
  주말: [0, 6],
  월: [1], 화: [2], 수: [3], 목: [4], 금: [5], 토: [6], 일: [0],
}
const DAY_NAME = ['일', '월', '화', '수', '목', '금', '토']

const toMin = (h: string, m?: string) => Number(h) * 60 + (m ? Number(m) : 0)

/**
 * "평일 9시 ~ 18시, 토 9시 ~ 13시" 같은 글을 읽는다. 못 읽으면 빈 배열.
 * (실제 연동 때는 공공데이터의 요일·시각 값을 그대로 쓰면 이 해석은 필요 없다)
 */
export function parseOpenHours(text: string): Slot[] {
  return text.split(',').flatMap((part) => {
    const m = part.trim().match(/^(매일|평일|주말|[월화수목금토일])\s*(\d{1,2})시(?:\s*(\d{1,2})분)?\s*~\s*(\d{1,2})시(?:\s*(\d{1,2})분)?$/)
    if (!m) return []
    return [{ days: DAY_WORDS[m[1]], open: toMin(m[2], m[3]), close: toMin(m[4], m[5]) }]
  })
}

const clock = (min: number) => `${Math.floor(min / 60)}시${min % 60 ? ` ${min % 60}분` : ''}`

export type OpenState = { open: true; text: string } | { open: false; text: string }

/** 지금 열려 있는지 — 못 읽는 형식이면 null (아무것도 안 보여 줌) */
export function openState(text: string, now = new Date()): OpenState | null {
  const slots = parseOpenHours(text)
  if (!slots.length) return null
  const today = now.getDay()
  const minute = now.getHours() * 60 + now.getMinutes()

  for (const s of slots)
    if (s.days.includes(today) && minute >= s.open && minute < s.close)
      return { open: true, text: `지금 열려 있어요 · ${clock(s.close)}까지` }

  // 다음에 여는 때 — 오늘 남은 시간 → 내일 → 그다음 요일
  for (let add = 0; add < 7; add++) {
    const day = (today + add) % 7
    const next = slots
      .filter((s) => s.days.includes(day) && (add > 0 || s.open > minute))
      .sort((a, b) => a.open - b.open)[0]
    if (next) {
      const when = add === 0 ? '오늘' : add === 1 ? '내일' : `${DAY_NAME[day]}요일`
      return { open: false, text: `${when} ${clock(next.open)}에 열어요` }
    }
  }
  return null
}
