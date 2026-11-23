/**
 * inbox API (알림함) — 푸시(C4)로 보내는 소식을 앱 안에도 모아 둔다.
 * 타입은 백엔드 OpenAPI에서 생성 (shared/api/types.ts).
 */
import { api } from '@/shared/api/client'
import type { Schema } from '@/shared/api/types'

export type NotificationItem = Schema<'NotificationItemOut'>

export const inboxApi = {
  list: () => api.get<NotificationItem[]>('/notifications'),
  read: (id: string) => api.post<void>(`/notifications/${id}/read`),
  readAll: () => api.post<void>('/notifications/read-all'),
}
