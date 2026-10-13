import { useState } from 'react'
import { errorMessage } from '@/shared/api/client'
import { useAsync } from '@/shared/lib/useAsync'
import { wellbeingApi, type AssessmentKind, type AssessmentResult } from '../api/wellbeingApi'

export function useIsolationIndex() {
  return useAsync(() => wellbeingApi.isolationIndex(), [])
}

export function useAssessmentHistory() {
  return useAsync(() => wellbeingApi.history(), [])
}

/** 한 문항씩 답하고 마지막에 제출 */
export function useAssessment(kind: AssessmentKind) {
  const form = useAsync(() => wellbeingApi.form(kind), [kind])
  const [answers, setAnswers] = useState<number[]>([])
  const [result, setResult] = useState<AssessmentResult | null>(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const total = form.data?.questions.length ?? 0
  const step = answers.length // 지금 보는 문항 번호(0부터)

  async function answer(value: number) {
    const next = [...answers, value]
    setAnswers(next)
    if (next.length < total) return
    setPending(true)
    setError(null)
    try {
      setResult(await wellbeingApi.submit(kind, next))
    } catch (e) {
      setError(errorMessage(e))
      setAnswers(next.slice(0, -1)) // 마지막 문항으로 돌아가 다시 누를 수 있게
    } finally {
      setPending(false)
    }
  }

  return {
    form: form.data,
    loadError: form.error,
    step,
    total,
    answer,
    back: () => setAnswers((a) => a.slice(0, -1)),
    result,
    pending,
    error,
  }
}
