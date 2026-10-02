/** activity API — 타입은 백엔드 OpenAPI에서 생성 (shared/api/types.ts) */
import { api } from '@/shared/api/client'
import type { Schema } from '@/shared/api/types'

export type ActivityData = Schema<'ActivityOut'>
/** 'all' 은 화면용 (전체 보기) — 서버에는 category 를 보내지 않는다 */
export type Category = 'all' | ActivityData['category']
export type MineKind = 'applied' | 'liked'

export const activityApi = {
  list: (category: Category) =>
    api.get<ActivityData[]>(category === 'all' ? '/activities' : `/activities?category=${category}`),
  detail: (id: string) => api.get<ActivityData>(`/activities/${id}`),
  apply: (id: string) => api.post<ActivityData>(`/activities/${id}/application`),
  cancel: (id: string) => api.delete<ActivityData>(`/activities/${id}/application`),
  like: (id: string) => api.put<ActivityData>(`/activities/${id}/like`),
  unlike: (id: string) => api.delete<ActivityData>(`/activities/${id}/like`),
  mine: (kind: MineKind) => api.get<ActivityData[]>(`/activities/mine?kind=${kind}`),
  counts: () => api.get<Schema<'MyActivityCounts'>>('/activities/mine/counts'),
}
