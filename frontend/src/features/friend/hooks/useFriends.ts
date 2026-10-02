import { useState } from 'react'
import { errorMessage } from '@/shared/api/client'
import { useAsync } from '@/shared/lib/useAsync'
import { friendApi, type FriendCardData, type FriendTab } from '../api/friendApi'
import { refreshReceivedCount } from './useReceivedCount'

/** 추천 목록 + 신청 (카드 상태를 즉시 '신청했어요'로 바꾼다) */
export function useRecommendations(tab: FriendTab) {
  const state = useAsync(() => friendApi.recommendations(tab), [tab])
  const [actionError, setActionError] = useState<string | null>(null)

  async function request(userId: string) {
    setActionError(null)
    try {
      const updated = await friendApi.request(userId)
      state.setData((cur) => cur?.map((c) => (c.user_id === userId ? updated : c)) ?? null)
      if (updated.relation === 'friends') void refreshReceivedCount() // 받은 신청을 맞신청으로 수락
    } catch (e) {
      setActionError(errorMessage(e))
    }
  }

  return { ...state, request, actionError }
}

/** 나에게 온 신청 — 수락·거절하면 목록에서 빠진다 */
export function useReceivedRequests(onChanged?: () => void) {
  const state = useAsync(() => friendApi.received(), [])

  async function respond(card: FriendCardData, accept: boolean) {
    if (!card.request_id) return
    await (accept ? friendApi.accept(card.request_id) : friendApi.decline(card.request_id))
    state.setData((cur) => cur?.filter((c) => c.user_id !== card.user_id) ?? null)
    void refreshReceivedCount()
    onChanged?.()
  }

  return { ...state, respond }
}

export function useMyFriends() {
  return useAsync(() => friendApi.friends(), [])
}
