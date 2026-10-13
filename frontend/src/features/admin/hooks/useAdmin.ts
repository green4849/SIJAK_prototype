import { useState } from 'react'
import { errorMessage } from '@/shared/api/client'
import { toast } from '@/shared/lib/toast'
import { useAsync } from '@/shared/lib/useAsync'
import { adminApi, type AdminCase, type CaseAction } from '../api/adminApi'

const DONE: Record<CaseAction, string> = {
  warn: '경고를 보냈어요',
  suspend: '7일 동안 이용을 멈췄어요',
  ban: '영구 이용 제한했어요',
  dismiss: '문제없음으로 닫았어요',
}

export function useCases() {
  const state = useAsync(() => adminApi.cases(), [])
  const [busy, setBusy] = useState<string | null>(null)

  async function act(c: AdminCase, action: CaseAction) {
    setBusy(c.id)
    try {
      const updated = await adminApi.act(c.id, action)
      state.setData((cur) => cur?.map((x) => (x.id === c.id ? updated : x)) ?? null)
      toast(`${c.target_name}님 — ${DONE[action]}`)
    } catch (e) {
      toast(errorMessage(e), 'error')
    } finally {
      setBusy(null)
    }
  }

  return { ...state, act, busy }
}

export function useWatchList() {
  return useAsync(() => adminApi.watch(), [])
}
