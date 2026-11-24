/**
 * 성향조사(8문항)와 추천 적합도 — backend/app/domains/friend/survey.py 의 사본. 고치면 둘 다.
 * 점수 = 30H + 10G + 10P + 15T + 10F + 25R (각 0~1, .5 올림 0~100). 세부 규칙 설명은 survey.py 맨 위.
 */
import type { Schema } from '@/shared/api/types'
import { INTERESTS, MAX_INTERESTS } from './constants'

type SurveyQuestion = Schema<'SurveyQuestion'>
export type SurveyAnswers = Schema<'SurveyAnswers'>
/** Q2~Q8 (Q1은 사용자 관심사) */
export type DSurvey = Omit<SurveyAnswers, 'interests'>

const PURPOSES = {
  chat: '편하게 일상 이야기 나누기',
  hobby: '함께 취미활동 즐기기',
  exercise: '산책하거나 운동하기',
  community: '지역 모임 및 행사 참여하기',
}
const PLACES: Record<string, string> = { park: '공원', cafe: '카페', center: '복지관·문화센터', restaurant: '동네 식당' }
const TIMES = {
  weekday_am: '평일 오전',
  weekday_pm: '평일 오후',
  weekday_eve: '평일 저녁',
  weekend: '주말',
  any: '시간 상관없음',
}
const FREQUENCIES = {
  often: '일주일에 여러 번',
  weekly: '일주일에 한 번',
  monthly: '한 달에 몇 번',
  sometimes: '가끔 편할 때',
}
const TALK_STYLES = {
  talker: '먼저 이야기를 꺼내는 편이에요.',
  listener: '상대방의 이야기를 주로 들어주는 편이에요.',
  balanced: '이야기하고 듣는 것을 비슷하게 해요.',
}
const WANTS = {
  listener: '이야기를 잘 들어주는 친구',
  lively: '밝고 활발한 친구',
  calm: '조용하고 차분한 친구',
  hobby: '취미를 함께 즐기는 친구',
}
const TRAITS = {
  lively: '활발함',
  calm: '차분함',
  warm: '다정함',
  listening: '경청',
  curious: '호기심',
  careful: '신중함',
  planned: '계획적',
  spontaneous: '즉흥적',
  caring: '배려심',
  humor: '유머감각',
}
const MAX_PLACES = 2
const MAX_TRAITS = 3

const q = (
  key: SurveyQuestion['key'],
  step: string,
  text: string,
  hint: string,
  options: Record<string, string>,
  max = 1,
): SurveyQuestion => ({ key, step, text, hint, min: 1, max, options: Object.entries(options).map(([code, label]) => ({ code, label })) })

export const QUESTIONS: SurveyQuestion[] = [
  q('interests', '나의 관심사', '평소 어떤 활동을 좋아하시나요?', `1개부터 ${MAX_INTERESTS}개까지 골라 주세요`, INTERESTS, MAX_INTERESTS),
  q('purpose', '나의 관심사', '새 친구와 가장 하고 싶은 일은 무엇인가요?', '하나만 골라 주세요', PURPOSES),
  q('places', '나의 생활 방식', '친구와 주로 어디에서 만나고 싶으신가요?', `${MAX_PLACES}개까지 골라 주세요`, PLACES, MAX_PLACES),
  q('times', '나의 생활 방식', '주로 언제 활동하기 편하신가요?', '여러 개 골라도 돼요', TIMES, Object.keys(TIMES).length),
  q('frequency', '나의 생활 방식', '친구와 얼마나 자주 만나고 싶으신가요?', '하나만 골라 주세요', FREQUENCIES),
  q('talk_style', '나의 관계 성향', '처음 만난 친구와 이야기할 때, 평소 나는 어떤 편인가요?', '정답은 없어요. 평소 내 모습에 가까운 답을 골라 주세요', TALK_STYLES),
  q('want', '나의 관계 성향', '어떤 친구와 함께할 때 가장 편안하신가요?', '하나만 골라 주세요', WANTS),
  q('traits', '나의 관계 성향', '나를 가장 잘 표현하는 단어는 무엇인가요?', `${MAX_TRAITS}개까지 골라 주세요`, TRAITS, MAX_TRAITS),
]

/** 문제가 있으면 사용자에게 보일 문구 */
export function validateSurvey(a: SurveyAnswers): string | null {
  for (const [i, question] of QUESTIONS.entries()) {
    const value = a[question.key] as string | string[] | undefined
    const codes = question.options.map((o) => o.code)
    if (question.max > 1) {
      const chosen = Array.isArray(value) ? value : []
      if (!chosen.length || chosen.some((c) => !codes.includes(c))) return `${i + 1}번 질문에 답해 주세요.`
      if (new Set(chosen).size > question.max) return `${i + 1}번 질문은 ${question.max}개까지 고를 수 있어요.`
    } else if (typeof value !== 'string' || !codes.includes(value)) return `${i + 1}번 질문에 답해 주세요.`
  }
  if (a.times.includes('any') && a.times.length > 1)
    return "4번 질문은 '시간 상관없음'만 고르거나, 다른 시간만 골라 주세요."
  return null
}

// ---------- 적합도 ----------

const OUTDOOR = new Set(['hobby', 'exercise', 'community'])
const FREQ_ORDER = Object.keys(FREQUENCIES)
const WANT_FIT: Record<string, [Record<string, number>, string[]]> = {
  listener: [{ listener: 1, balanced: 0.5, talker: 0 }, ['listening', 'caring', 'warm']],
  lively: [{ talker: 1, balanced: 0.5, listener: 0 }, ['lively', 'humor', 'curious']],
  calm: [{ listener: 1, balanced: 0.5, talker: 0 }, ['calm', 'careful', 'planned']],
}
const TIME_SUBJECT: Record<string, string> = {
  weekday_am: '평일 오전이',
  weekday_pm: '평일 오후가',
  weekday_eve: '평일 저녁이',
  weekend: '주말이',
}
const PURPOSE_REASON: Record<string, string> = {
  chat: '둘 다 편하게 이야기 나누고 싶어 해요',
  hobby: '둘 다 취미를 함께 즐기고 싶어 해요',
  exercise: '둘 다 함께 걷거나 운동하고 싶어 해요',
  community: '둘 다 동네 모임에 나가고 싶어 해요',
}
const WANT_REASON: Record<string, string> = {
  listener: "바라시던 '이야기를 잘 들어주는' 분이에요",
  lively: "바라시던 '밝고 활발한' 분이에요",
  calm: "바라시던 '조용하고 차분한' 분이에요",
  hobby: "바라시던 '취미를 함께 즐길' 분이에요",
}

export function overlap(a: string[], b: string[]) {
  const A = new Set(a)
  const B = new Set(b)
  if (!A.size || !B.size) return 0
  return [...A].filter((x) => B.has(x)).length / Math.min(A.size, B.size)
}
const purposeFit = (a: string, b: string) => (a === b ? 1 : OUTDOOR.has(a) && OUTDOOR.has(b) ? 0.5 : 0)
const timeFit = (a: string[], b: string[]) =>
  a.includes('any') || b.includes('any') ? (a.length && b.length ? 1 : 0) : overlap(a, b)
const frequencyFit = (a: string, b: string) =>
  ({ 0: 1, 1: 0.5 })[Math.abs(FREQ_ORDER.indexOf(a) - FREQ_ORDER.indexOf(b))] ?? 0

function desireFit(wanter: DSurvey, other: DSurvey, h: number, g: number) {
  if (wanter.want === 'hobby') return (h + g) / 2
  const [talk, words] = WANT_FIT[wanter.want]
  return ((talk[other.talk_style] ?? 0) + (other.traits.some((t) => words.includes(t)) ? 1 : 0)) / 2
}

export interface Match {
  score: number
  label: string | null
  reasons: string[]
}

export function match(myInterests: string[], theirInterests: string[], mine?: DSurvey, theirs?: DSurvey): Match {
  const h = overlap(myInterests, theirInterests)
  if (!mine || !theirs) return { score: Math.round(30 * h), label: null, reasons: [] }
  const g = purposeFit(mine.purpose, theirs.purpose)
  const p = overlap(mine.places, theirs.places)
  const t = timeFit(mine.times, theirs.times)
  const f = frequencyFit(mine.frequency, theirs.frequency)
  const dMe = desireFit(mine, theirs, h, g)
  const r = (dMe + desireFit(theirs, mine, h, g)) / 2
  const score = Math.round(30 * h + 10 * g + 10 * p + 15 * t + 10 * f + 25 * r)
  const label = score >= 70 ? '잘 맞아요' : score >= 50 ? '비슷한 점이 많아요' : null

  const reasons: string[] = []
  const commonTime = mine.times.find((x) => theirs.times.includes(x) && TIME_SUBJECT[x])
  if (commonTime) reasons.push(`둘 다 ${TIME_SUBJECT[commonTime]} 편해요`)
  if (dMe >= 0.75) reasons.push(WANT_REASON[mine.want])
  const commonPlace = mine.places.find((x) => theirs.places.includes(x))
  if (commonPlace) reasons.push(`둘 다 ${PLACES[commonPlace]}에서 만나고 싶어 해요`)
  if (g === 1) reasons.push(PURPOSE_REASON[mine.purpose])
  if (f === 1) reasons.push('만나고 싶은 횟수가 비슷해요')
  return { score, label, reasons: reasons.slice(0, 3) }
}
