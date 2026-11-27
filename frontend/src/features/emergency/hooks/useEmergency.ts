import { useState } from 'react'
import { errorMessage } from '@/shared/api/client'
import { toast } from '@/shared/lib/toast'
import { useAsync } from '@/shared/lib/useAsync'
import { emergencyApi, type SosResult } from '../api/emergencyApi'

export function useGuardians() {
  const state = useAsync(() => emergencyApi.guardians(), [])

  async function remove(id: string, name: string) {
    try {
      await emergencyApi.removeGuardian(id)
      state.setData((cur) => cur?.filter((g) => g.id !== id) ?? null)
      toast(`${name}님을 보호자에서 뺐어요`)
    } catch (e) {
      toast(errorMessage(e), 'error')
    }
  }

  return { ...state, remove }
}

/** 도움 요청 보내기 */
export function useSos() {
  const [result, setResult] = useState<SosResult | null>(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function send() {
    setPending(true)
    setError(null)
    try {
      const r = await emergencyApi.sos()
      setResult(r)
      return r
    } catch (e) {
      setError(errorMessage(e))
      return null
    } finally {
      setPending(false)
    }
  }

  return { result, pending, error, send, reset: () => setResult(null) }
}

/** 문자 발송이 켜져 있는지 — 모르는 동안(null)에는 '보낸다'고 말하지 않는다 */
export function useSmsEnabled(): boolean | null {
  const { data } = useAsync(() => emergencyApi.info(), [])
  return data ? data.sms_enabled : null
}
