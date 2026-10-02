import { useAsync } from '@/shared/lib/useAsync'
import { safetyApi } from '../api/safetyApi'

export function useReportReasons() {
  return useAsync(() => safetyApi.reasons(), [])
}

export function useBlockedUsers() {
  const state = useAsync(() => safetyApi.blocks(), [])
  async function unblock(userId: string) {
    await safetyApi.unblock(userId)
    state.setData((cur) => cur?.filter((u) => u.user_id !== userId) ?? null)
  }
  return { ...state, unblock }
}
