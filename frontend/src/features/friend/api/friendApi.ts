/** friend API — 타입은 백엔드 OpenAPI에서 생성 (shared/api/types.ts) */
import { api } from '@/shared/api/client'
import type { Schema } from '@/shared/api/types'

/** 친구 카드. distance_km 은 거리를 모를 때 null */
export type FriendCardData = Schema<'FriendCard'>
export type Relation = FriendCardData['relation']
export type FriendTab = 'recommended' | 'nearby'

export const friendApi = {
  recommendations: (tab: FriendTab) =>
    api.get<FriendCardData[]>(`/friends/recommendations?tab=${tab}`),
  friends: () => api.get<FriendCardData[]>('/friends'),
  received: () => api.get<FriendCardData[]>('/friends/requests'),
  request: (toUserId: string) =>
    api.post<FriendCardData>('/friends/requests', { to_user_id: toUserId } satisfies Schema<'FriendRequestCreate'>),
  accept: (requestId: string) => api.post<void>(`/friends/requests/${requestId}/accept`),
  decline: (requestId: string) => api.post<void>(`/friends/requests/${requestId}/decline`),
}
