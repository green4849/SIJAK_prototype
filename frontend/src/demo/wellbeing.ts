/**
 * 마음 건강 계산 — 데모용 (C11).
 *  - 사회적 관계 지수: 보고서 4.5.3 고립 지수 II = 100 − (0.25A + 0.30C + 0.20E + 0.15S + 0.10R) 를 뒤집은 값
 *    = 0.25A + 0.30C + 0.20E + 0.15S + 0.10R (높을수록 좋음). 단계 경계도 그대로 뒤집었다.
 *    각 요인은 데모 저장소의 실제 활동(접속·대화·말동무 정서·친구·활동 신청)으로 어림한다
 *  - 자가평가: PHQ-9 · GAD-7 (쉬운 말로 다듬은 문항), 점수 구간은 표준 기준
 */
import { db, type DAssessment, type DUser } from './store'
import type { AssessmentFormOut, AssessmentResultOut, RelationFactor, RelationIndexOut, RelationLevel } from '@/shared/api/draft'

const DAY = 86400_000
const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)))

export const WEIGHTS = { activity: 0.25, communication: 0.3, emotion: 0.2, social: 0.15, responsiveness: 0.1 }

const FACTOR_LABELS: Record<RelationFactor['code'], string> = {
  activity: '앱 활동',
  communication: '대화',
  emotion: '마음',
  social: '이웃 만남',
  responsiveness: '답장',
}

/** 보고서 고립 지수 단계(0~30 정상 · 30~60 주의 · 60~80 위험 · 80~ 긴급)를 뒤집은 경계 */
export function levelOf(score: number): RelationLevel {
  if (score > 70) return 'normal'
  if (score > 40) return 'caution'
  if (score > 20) return 'risk'
  return 'urgent'
}

function factors(me: DUser): Record<RelationFactor['code'], number> {
  const s = db()
  const now = Date.now()
  const since = (iso: string, days: number) => now - new Date(iso).getTime() < days * DAY

  // A: 최근 접속 — 오늘 들어왔으면 높게
  const activity = clamp(100 - ((now - me.last_login) / DAY) * 15)

  // C: 최근 14일 내가 한 말 (이웃 대화 + 말동무)
  const myRooms = new Set(s.rooms.filter((r) => r.a === me.id || r.b === me.id).map((r) => r.id))
  const said =
    s.messages.filter((m) => myRooms.has(m.room) && m.sender === me.id && since(m.created_at, 14)).length +
    s.companion.filter((m) => m.uid === me.id && m.role === 'user' && since(m.at, 14)).length
  const communication = clamp(said * 12)

  // E: 말동무 대화의 정서 — 슬픔·불안 비율이 높을수록 낮게
  const felt = s.companion.filter((m) => m.uid === me.id && m.emotion && since(m.at, 14))
  const heavy = felt.filter((m) => m.emotion === 'sadness' || m.emotion === 'anxiety').length
  const emotion = felt.length ? clamp(100 - (heavy / felt.length) * 100) : 70

  // S: 친구 수 + 신청한 활동 수
  const friends = s.requests.filter((r) => r.status === 'accepted' && (r.from === me.id || r.to === me.id)).length
  const applied = s.applications.filter((a) => a.uid === me.id).length
  const social = clamp(friends * 20 + applied * 15)

  // R: 알림 응답 속도 — 데모는 고정
  const responsiveness = 70

  return { activity, communication, emotion, social, responsiveness }
}

export function relationIndex(me: DUser): RelationIndexOut {
  const f = factors(me)
  const raw = (Object.keys(WEIGHTS) as (keyof typeof WEIGHTS)[]).reduce((sum, k) => sum + WEIGHTS[k] * f[k], 0)
  const score = clamp(raw)
  const past = db().relationHistory[me.id] ?? []
  const weeks = [...past, score]
  return {
    score,
    level: levelOf(score),
    factors: (Object.keys(FACTOR_LABELS) as RelationFactor['code'][]).map((code) => ({
      code,
      label: FACTOR_LABELS[code],
      score: f[code],
    })),
    weekly: weeks.map((v, i) => ({ label: i === weeks.length - 1 ? '이번 주' : `${weeks.length - 1 - i}주 전`, score: v })),
    updated_at: new Date().toISOString(),
  }
}

// ---------- 자가평가 ----------

const OPTIONS = [
  { value: 0, label: '전혀 없었어요' },
  { value: 1, label: '며칠 있었어요' },
  { value: 2, label: '일주일 넘게' },
  { value: 3, label: '거의 매일' },
]

export const FORMS: Record<'phq9' | 'gad7', AssessmentFormOut> = {
  phq9: {
    kind: 'phq9',
    title: '기분 점검',
    lead: '지난 2주 동안 이런 일이 얼마나 있었나요?',
    options: OPTIONS,
    questions: [
      '하고 싶은 일이 없고, 무엇을 해도 재미가 없었다',
      '기분이 가라앉거나, 우울하거나, 희망이 없다고 느꼈다',
      '잠들기 어렵거나 자주 깼다. 또는 너무 많이 잤다',
      '피곤하고 기운이 없었다',
      '입맛이 없었다. 또는 너무 많이 먹었다',
      '내가 못났다거나, 가족을 실망시켰다는 생각이 들었다',
      '신문이나 TV를 볼 때 집중하기 어려웠다',
      '남들이 알아챌 만큼 느리게 움직였다. 또는 안절부절못했다',
      '차라리 죽는 게 낫겠다거나, 나를 해치고 싶은 생각이 들었다',
    ].map((text, i) => ({ id: i + 1, text })),
  },
  gad7: {
    kind: 'gad7',
    title: '걱정 점검',
    lead: '지난 2주 동안 이런 일이 얼마나 있었나요?',
    options: OPTIONS,
    questions: [
      '초조하거나 불안하거나 조마조마했다',
      '걱정을 멈추기 어려웠다',
      '여러 가지 일을 너무 많이 걱정했다',
      '편하게 쉬기 어려웠다',
      '너무 안절부절못해서 가만히 있기 어려웠다',
      '쉽게 짜증이 나거나 화가 났다',
      '무언가 끔찍한 일이 생길 것처럼 두려웠다',
    ].map((text, i) => ({ id: i + 1, text })),
  },
}

const LEVELS: { max: number; level: AssessmentResultOut['level']; label: string; advice: string }[] = [
  { max: 4, level: 'minimal', label: '괜찮아요', advice: '마음이 편안한 편이에요. 지금처럼 이웃과 자주 이야기 나눠요.' },
  { max: 9, level: 'mild', label: '조금 지쳐 있어요', advice: '가벼운 산책이나 동네 모임이 도움이 돼요. 2주 뒤에 다시 점검해 봐요.' },
  { max: 14, level: 'moderate', label: '마음이 많이 힘들어요', advice: '혼자 견디지 마세요. 복지관 상담 선생님이나 가족과 이야기해 보세요.' },
  { max: 99, level: 'severe', label: '도움이 꼭 필요해요', advice: '전문가와 꼭 이야기해 보세요. 보호자에게도 알려 드릴게요.' },
]

export function resultOf(a: DAssessment): AssessmentResultOut {
  const form = FORMS[a.kind]
  const score = a.answers.reduce((x, y) => x + y, 0)
  const lv = LEVELS.find((l) => score <= l.max) ?? LEVELS[LEVELS.length - 1]
  return {
    id: a.id,
    kind: a.kind,
    title: form.title,
    score,
    max_score: form.questions.length * 3,
    level: lv.level,
    level_label: lv.label,
    advice: lv.advice,
    crisis: a.kind === 'phq9' && (a.answers[8] ?? 0) > 0,
    created_at: a.at,
  }
}
