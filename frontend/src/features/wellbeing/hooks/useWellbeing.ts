import { useState } from 'react'
import { errorMessage } from '@/shared/api/client'
import { useAsync } from '@/shared/lib/useAsync'
import { wellbeingApi, type AssessmentKind, type AssessmentResult } from '../api/wellbeingApi'

export function useRelationIndex() {
  return useAsync(() => wellbeingApi.relationIndex(), [])
}

export function useAssessmentHistory() {
  return useAsync(() => wellbeingApi.history(), [])
}

export function useWho5Status() {
  return useAsync(() => wellbeingApi.who5Status(), [])
}

/** WHO-5 — 한 문항씩 고르고 '다음'으로 넘어간다 (고른 것을 다시 볼 수 있게, 디자인 2026-11-24) */
export function useWho5() {
  const form = useAsync(() => wellbeingApi.form('who5'), [])
  const [answers, setAnswers] = useState<(number | undefined)[]>([])
  const [step, setStep] = useState(0)
  const [result, setResult] = useState<AssessmentResult | null>(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const total = form.data?.questions.length ?? 0

  function choose(value: number) {
    setAnswers((a) => {
      const next = [...a]
      next[step] = value
      return next
    })
  }

  async function next() {
    if (answers[step] === undefined) return
    if (step < total - 1) {
      setStep(step + 1)
      return
    }
    setPending(true)
    setError(null)
    try {
      setResult(await wellbeingApi.submit('who5', answers as number[]))
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setPending(false)
    }
  }

  return {
    form: form.data,
    loadError: form.error,
    step,
    total,
    chosen: answers[step],
    choose,
    next,
    back: () => setStep((s) => Math.max(0, s - 1)),
    result,
    pending,
    error,
  }
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
