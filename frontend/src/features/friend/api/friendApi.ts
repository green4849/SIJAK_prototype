/** friend 백엔드 계약 — backend/app/domains/friend/schemas.py 와 1:1 */
import { api } from '@/shared/api/client'

export type Relation = 'none' | 'sent' | 'received' | 'friends'
export type FriendTab = 'recommended' | 'nearby'

export interface FriendCardData {
  user_id: string
  name: string
  age: number
  gender: 'M' | 'F'
  intro: string
  region_name: string
  interests: string[]
  common_interests: string[]
  /** 반경 검색 미구현이면 null (docs/deferred.md §1) */
  distance_km: number | null
  relation: Relation
  request_id: string | null
}

export const friendApi = {
  recommendations: (tab: FriendTab) =>
    api.get<FriendCardData[]>(`/friends/recommendations?tab=${tab}`),
  friends: () => api.get<FriendCardData[]>('/friends'),
  received: () => api.get<FriendCardData[]>('/friends/requests'),
  request: (toUserId: string) =>
    api.post<FriendCardData>('/friends/requests', { to_user_id: toUserId }),
  accept: (requestId: string) => api.post<void>(`/friends/requests/${requestId}/accept`),
  decline: (requestId: string) => api.post<void>(`/friends/requests/${requestId}/decline`),
}
