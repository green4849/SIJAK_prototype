import { useState } from 'react'
import { errorMessage } from '@/shared/api/client'
import { createPolledStore } from '@/shared/lib/createPolledStore'
import { useAsync } from '@/shared/lib/useAsync'
import { toast } from '@/shared/lib/toast'
import { pointsApi, type Mission } from '../api/pointsApi'

/**
 * 잔액은 홈·마이페이지·친구 찾기·포인트 화면이 함께 쓴다 → 요청은 하나만 (1분마다).
 * 포인트가 바뀌는 동작(신청·평가·봉사 신청) 뒤에는 페이지가 refreshPoints()를 부른다.
 */
const summaryStore = createPolledStore(pointsApi.summary, 60_000)

export const usePointSummary = summaryStore.useValue
export const refreshPoints = summaryStore.refresh

export function usePointHistory() {
  return useAsync(() => pointsApi.history(), [])
}

/** 미션 목록 + 보상 받기 */
export function useMissions() {
  const state = useAsync(() => pointsApi.missions(), [])
  const [claiming, setClaiming] = useState(false)

  async function claim(m: Mission) {
    setClaiming(true)
    try {
      const updated = await pointsApi.claim(m.code)
      state.setData((cur) => cur?.map((x) => (x.code === m.code ? updated : x)) ?? null)
      void refreshPoints()
      toast(`${m.reward.toLocaleString()}P를 받았어요`)
    } catch (e) {
      toast(errorMessage(e), 'error')
    } finally {
      setClaiming(false)
    }
  }

  return { ...state, claim, claiming }
}
