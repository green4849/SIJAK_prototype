import { useAsync } from '@/shared/lib/useAsync'
import { toast } from '@/shared/lib/toast'
import { safetyApi } from '../api/safetyApi'

export function useReportReasons() {
  return useAsync(() => safetyApi.reasons(), [])
}

export function useBlockedUsers() {
  const state = useAsync(() => safetyApi.blocks(), [])
  async function unblock(userId: string) {
    await safetyApi.unblock(userId)
    const name = state.data?.find((u) => u.user_id === userId)?.name
    state.setData((cur) => cur?.filter((u) => u.user_id !== userId) ?? null)
    toast(name ? `${name}님 차단을 풀었어요` : '차단을 풀었어요')
  }
  return { ...state, unblock }
}
