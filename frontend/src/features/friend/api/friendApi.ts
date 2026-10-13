/** friend API — 타입은 백엔드 OpenAPI에서 생성 (shared/api/types.ts) */
import { api } from '@/shared/api/client'
import type { Schema } from '@/shared/api/types'

/** 친구 카드. distance_km 은 거리를 모를 때 null */
export type FriendCardData = Schema<'FriendCard'>
export type Relation = FriendCardData['relation']
export type FriendTab = 'recommended' | 'nearby'
/** 추천 평가 (C12): 만나보고 싶어요 / 그저 그래요 / 잘 안 맞아요 */
export type Rating = Schema<'RatingCreate'>['rating']
export type RatingResult = Schema<'RatingOut'>

export const friendApi = {
  recommendations: (tab: FriendTab) =>
    api.get<FriendCardData[]>(`/friends/recommendations?tab=${tab}`),
  friends: () => api.get<FriendCardData[]>('/friends'),
  received: () => api.get<FriendCardData[]>('/friends/requests'),
  request: (toUserId: string) =>
    api.post<FriendCardData>('/friends/requests', { to_user_id: toUserId } satisfies Schema<'FriendRequestCreate'>),
  rate: (userId: string, rating: Rating) =>
    api.put<RatingResult>(`/friends/recommendations/${userId}/rating`, { rating } satisfies Schema<'RatingCreate'>),
  accept: (requestId: string) => api.post<void>(`/friends/requests/${requestId}/accept`),
  decline: (requestId: string) => api.post<void>(`/friends/requests/${requestId}/decline`),
}
