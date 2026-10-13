import { useState } from 'react'
import { errorMessage } from '@/shared/api/client'
import { useAsync } from '@/shared/lib/useAsync'
import { toast } from '@/shared/lib/toast'
import { activityApi, type ActivityData, type Category, type MineKind } from '../api/activityApi'

export function useActivityList(category: Category) {
  return useAsync(() => activityApi.list(category), [category])
}

export function useMyActivities(kind: MineKind) {
  return useAsync(() => activityApi.mine(kind), [kind])
}

export function useActivityCounts() {
  return useAsync(() => activityApi.counts(), [])
}

/** 상세 + 신청/취소/관심 — 서버가 돌려준 최신 상태로 화면을 바꾼다 */
export function useActivity(id: string, onPointsChanged?: () => void) {
  const state = useAsync(() => activityApi.detail(id), [id])
  const [pending, setPending] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  async function act(fn: () => Promise<ActivityData>, done: (a: ActivityData) => string) {
    setPending(true)
    setActionError(null)
    try {
      const a = await fn()
      state.setData(a)
      toast(done(a))
      if (a.reward_points > 0) onPointsChanged?.()
    } catch (e) {
      setActionError(errorMessage(e))
      void state.reload() // 정원 마감 등 → 최신 상태 다시
    } finally {
      setPending(false)
    }
  }

  return {
    ...state,
    pending,
    actionError,
    apply: () =>
      act(
        () => activityApi.apply(id),
        (a) => `'${a.title}' 신청했어요` + (a.reward_points ? ` · +${a.reward_points}P` : ''),
      ),
    cancel: () =>
      act(
        () => activityApi.cancel(id),
        (a) => '신청을 취소했어요' + (a.reward_points ? ` · 포인트를 돌려드렸어요` : ''),
      ),
    toggleLike: () =>
      act(
        () => (state.data?.liked ? activityApi.unlike(id) : activityApi.like(id)),
        (a) => (a.liked ? '관심 있는 활동에 담았어요' : '관심 있는 활동에서 뺐어요'),
      ),
  }
}
