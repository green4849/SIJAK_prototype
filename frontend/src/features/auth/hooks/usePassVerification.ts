/**
 * 본인인증 2단계 상태 머신
 *   identity(정보 입력) → code(인증번호 입력) → done(결과)
 */
import { useRef, useState } from 'react'
import { errorMessage } from '@/shared/api/client'
import { authApi, type AuthResult, type PassStartInput } from '../api/authApi'
import type { SentSms } from '../lib/firebaseSms'

type Step =
  /** last: 인증번호 단계에서 돌아왔을 때 다시 채울 정보 */
  | { name: 'identity'; last?: PassStartInput }
  /** sentTo: Firebase 로 실제 문자를 보낸 번호 (Mock 이면 null — 화면에 devCode) */
  | { name: 'code'; sessionId: string; devCode: string | null; sentTo: string | null; input: PassStartInput }
  | { name: 'done'; result: AuthResult }

export function usePassVerification() {
  const [step, setStep] = useState<Step>({ name: 'identity' })
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  /** Firebase 로 보낸 문자 — 확인할 때 쓴다 */
  const sms = useRef<SentSms | null>(null)

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
      sms.current = null
      if (r.sms) {
        // 실제 문자 — firebase 는 이때 처음 불러온다
        const { sendSms } = await import('../lib/firebaseSms')
        sms.current = await sendSms(r.sms)
      }
      setStep({
        name: 'code',
        sessionId: r.session_id,
        devCode: r.dev_code,
        sentTo: r.sms ? input.phone : null,
        input,
      })
    })

  const verify = (code: string) =>
    run(async () => {
      if (step.name !== 'code') return
      const proof = sms.current ? { id_token: await sms.current.confirm(code) } : { code }
      const result = await authApi.verifyPass(step.sessionId, proof)
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
