/**
 * 본인인증 2단계 상태 머신
 *   identity(정보 입력) → code(인증번호 입력) → done(결과)
 */
import { useState } from 'react'
import { errorMessage } from '@/shared/api/client'
import { authApi, type AuthResult, type PassStartInput } from '../api/authApi'

type Step =
  /** last: 인증번호 단계에서 돌아왔을 때 다시 채울 정보 */
  | { name: 'identity'; last?: PassStartInput }
  | { name: 'code'; sessionId: string; devCode: string | null; input: PassStartInput }
  | { name: 'done'; result: AuthResult }

export function usePassVerification() {
  const [step, setStep] = useState<Step>({ name: 'identity' })
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function run(fn: () => Promise<void>) {
    setPending(true)
    setError(null)
    try {
      await fn()
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setPending(false)
    }
  }

  const start = (input: PassStartInput) =>
    run(async () => {
      const r = await authApi.startPass(input)
      setStep({ name: 'code', sessionId: r.session_id, devCode: r.dev_code, input })
    })

  const verify = (code: string) =>
    run(async () => {
      if (step.name !== 'code') return
      const result = await authApi.verifyPass(step.sessionId, code)
      setStep({ name: 'done', result })
    })

  /** 인증번호 다시 받기 — 입력했던 정보로 새 세션 */
  const resend = () => (step.name === 'code' ? start(step.input) : Promise.resolve())

  /** 정보 입력으로 한 단계 돌아가기 — 적어 둔 것은 다시 채운다 */
  const reset = () => {
    setError(null)
    setStep((cur) => ({ name: 'identity', last: cur.name === 'code' ? cur.input : undefined }))
  }

  return { step, pending, error, start, verify, resend, reset }
}
