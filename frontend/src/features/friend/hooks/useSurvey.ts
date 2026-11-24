import { useState } from 'react'
import { errorMessage } from '@/shared/api/client'
import { useAsync } from '@/shared/lib/useAsync'
import { friendApi, type SurveyAnswers, type SurveyQuestion } from '../api/friendApi'

/** '다음에 하기'를 누른 적이 있는지 — 이 기기에서만 기억한다 (못 읽으면 처음처럼) */
const LATER_KEY = 'wipi.surveyLater'

export function surveyPostponed(): boolean {
  try {
    return localStorage.getItem(LATER_KEY) === '1'
  } catch {
    return false
  }
}

export function postponeSurvey() {
  try {
    localStorage.setItem(LATER_KEY, '1')
  } catch {
    /* 저장이 막힌 브라우저 — 다음에 또 물어도 괜찮다 */
  }
}

export function useSurveyStatus() {
  return useAsync(() => friendApi.survey(), [])
}

/** 추천 친구 탭에 들어왔을 때 성향조사 시작 화면으로 보낼지 (불러오는 중이면 null). '다음에 하기'는 페이지가 본다 */
export function useSurveyGate(): boolean | null {
  const { data, error } = useSurveyStatus()
  if (error) return false
  if (!data) return null
  return !data.answers
}

type Value = string | string[]
type Draft = Partial<Record<SurveyQuestion['key'], Value>>

/** 한 화면에 한 문항 — 고른 답은 단계를 오가도 남는다. 마지막에 한 번에 저장 */
export function useSurveyForm() {
  const survey = useAsync(() => friendApi.survey(), [])
  const [draft, setDraft] = useState<Draft | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const questions = survey.data?.questions ?? []
  // 처음 열면 지난 답(없으면 가입 때 고른 관심사)으로 채운다
  const current: Draft =
    draft ?? (survey.data ? (survey.data.answers ?? { interests: survey.data.my_interests }) : {})

  const valueOf = (q: SurveyQuestion): Value => current[q.key] ?? (q.max > 1 ? [] : '')
  const answered = (q: SurveyQuestion) => {
    const v = valueOf(q)
    return Array.isArray(v) ? v.length >= q.min : v !== ''
  }

  function choose(q: SurveyQuestion, code: string) {
    setNote(null)
    setError(null)
    if (q.max === 1) return setDraft({ ...current, [q.key]: code })
    const list = valueOf(q) as string[]
    if (list.includes(code)) return setDraft({ ...current, [q.key]: list.filter((x) => x !== code) })
    // '시간 상관없음'은 다른 시간과 함께 고르지 않는다 — 고르면 나머지를 비운다
    if (q.key === 'times' && (code === 'any' || list.includes('any')))
      return setDraft({ ...current, [q.key]: [code] })
    // 눌렀는데 아무 반응이 없으면 고장으로 오해한다 → 이유를 말해 준다
    if (list.length >= q.max)
      return setNote(`${q.max}개까지 고를 수 있어요. 다른 걸 고르려면 하나를 먼저 눌러서 빼 주세요.`)
    setDraft({ ...current, [q.key]: [...list, code] })
  }

  async function submit() {
    setPending(true)
    setError(null)
    try {
      await friendApi.saveSurvey(current as SurveyAnswers)
      setSaved(true)
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setPending(false)
    }
  }

  return {
    loadError: survey.error,
    loaded: !!survey.data,
    done: !!survey.data?.answers,
    questions,
    valueOf,
    answered,
    choose,
    note,
    clearNote: () => setNote(null),
    submit,
    pending,
    error,
    saved,
    restart: () => setSaved(false),
  }
}
