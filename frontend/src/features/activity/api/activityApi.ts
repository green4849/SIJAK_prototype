/** activity 백엔드 계약 — backend/app/domains/activity/schemas.py 와 1:1 */
import { api } from '@/shared/api/client'

export type Category = 'all' | 'culture' | 'health' | 'learning'
export type MineKind = 'applied' | 'liked'

export interface ActivityData {
  id: string
  title: string
  subtitle: string
  category: Exclude<Category, 'all'>
  category_label: string
  place: string
  schedule_text: string
  starts_at: string
  ends_at: string
  capacity: number
  applied_count: number
  is_full: boolean
  applied: boolean
  liked: boolean
  description: string
  image_kind: string
}

export const activityApi = {
  list: (category: Category) =>
    api.get<ActivityData[]>(category === 'all' ? '/activities' : `/activities?category=${category}`),
  detail: (id: string) => api.get<ActivityData>(`/activities/${id}`),
  apply: (id: string) => api.post<ActivityData>(`/activities/${id}/application`),
  cancel: (id: string) => api.delete<ActivityData>(`/activities/${id}/application`),
  like: (id: string) => api.put<ActivityData>(`/activities/${id}/like`),
  unlike: (id: string) => api.delete<ActivityData>(`/activities/${id}/like`),
  mine: (kind: MineKind) => api.get<ActivityData[]>(`/activities/mine?kind=${kind}`),
  counts: () => api.get<{ applied: number; liked: number }>('/activities/mine/counts'),
}
