import { useState } from 'react'
import { ApiError, errorMessage } from '@/shared/api/client'
import { useAsync } from '@/shared/lib/useAsync'
import { toast } from '@/shared/lib/toast'
import { friendApi, type FriendCardData, type FriendTab, type Rating } from '../api/friendApi'
import { refreshReceivedCount } from './useReceivedCount'

/** 포인트와 엮인 일 (C12) — points feature를 모르므로 페이지가 넘겨준다 */
export interface PointHooks {
  /** 포인트가 바뀌었을 수 있는 동작 뒤 (신청·평가) */
  onPointsChanged?: () => void
  /** 친구 신청에 포인트가 모자랄 때 — 오류 문구 대신 안내 창 */
  onInsufficientPoints?: () => void
}

const RATING_TOAST: Record<Rating, string> = {
  like: '만나보고 싶은 이웃으로 담았어요',
  neutral: '평가를 남겼어요',
  dislike: '다음부터 추천하지 않을게요',
}

/** 추천 목록 + 신청 (카드 상태를 즉시 '신청했어요'로 바꾼다) + 평가 */
export function useRecommendations(tab: FriendTab, points: PointHooks = {}) {
  const state = useAsync(() => friendApi.recommendations(tab), [tab])
  const [actionError, setActionError] = useState<string | null>(null)

  async function request(userId: string) {
    setActionError(null)
    try {
      const updated = await friendApi.request(userId)
      points.onPointsChanged?.()
      state.setData((cur) => cur?.map((c) => (c.user_id === userId ? updated : c)) ?? null)
      if (updated.relation === 'friends') {
        void refreshReceivedCount() // 받은 신청을 맞신청으로 수락
        toast(`${updated.name}님과 친구가 됐어요`)
      } else {
        toast(`${updated.name}님께 친구 신청을 보냈어요`)
      }
    } catch (e) {
      if (e instanceof ApiError && e.code === 'insufficient_points' && points.onInsufficientPoints)
        points.onInsufficientPoints()
      else setActionError(errorMessage(e))
    }
  }

  /** 평가 — '잘 안 맞아요'는 목록에서 바로 뺀다 (서버도 다음 추천에서 뺀다) */
  async function rate(card: FriendCardData, rating: Rating) {
    setActionError(null)
    try {
      const result = await friendApi.rate(card.user_id, rating)
      state.setData(
        (cur) =>
          cur
            ?.filter((c) => !(rating === 'dislike' && c.user_id === card.user_id))
            .map((c) => (c.user_id === card.user_id ? { ...c, my_rating: rating } : c)) ?? null,
      )
      points.onPointsChanged?.()
      const bonus = result.points_earned ? ` · +${result.points_earned}P` : ''
      toast(RATING_TOAST[rating] + bonus, rating === 'dislike' ? 'info' : 'success')
    } catch (e) {
      setActionError(errorMessage(e))
    }
  }

  return { ...state, request, rate, actionError }
}

/** 나에게 온 신청 — 수락·거절하면 목록에서 빠진다 */
export function useReceivedRequests(onChanged?: () => void) {
  const state = useAsync(() => friendApi.received(), [])

  async function respond(card: FriendCardData, accept: boolean) {
    if (!card.request_id) return
    await (accept ? friendApi.accept(card.request_id) : friendApi.decline(card.request_id))
    state.setData((cur) => cur?.filter((c) => c.user_id !== card.user_id) ?? null)
    void refreshReceivedCount()
    toast(accept ? `${card.name}님과 친구가 됐어요` : '신청을 넘겼어요', accept ? 'success' : 'info')
    onChanged?.()
  }

  return { ...state, respond }
}

export function useMyFriends() {
  return useAsync(() => friendApi.friends(), [])
}
