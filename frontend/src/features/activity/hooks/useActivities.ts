import { useState } from 'react'
import { errorMessage } from '@/shared/api/client'
import { useAsync } from '@/shared/lib/useAsync'
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
export function useActivity(id: string) {
  const state = useAsync(() => activityApi.detail(id), [id])
  const [pending, setPending] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  async function act(fn: () => Promise<ActivityData>) {
    setPending(true)
    setActionError(null)
    try {
      state.setData(await fn())
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
    apply: () => act(() => activityApi.apply(id)),
    cancel: () => act(() => activityApi.cancel(id)),
    toggleLike: () =>
      act(() => (state.data?.liked ? activityApi.unlike(id) : activityApi.like(id))),
  }
}
