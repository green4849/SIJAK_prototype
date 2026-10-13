/**
 * inbox API (알림함) — 푸시(C4)로 보내는 소식을 앱 안에도 모아 둔다.
 * 백엔드가 아직 없어 계약은 shared/api/draft.ts (데모 서버만 응답).
 */
import { api } from '@/shared/api/client'
import type { NotificationItemOut } from '@/shared/api/draft'

export type NotificationItem = NotificationItemOut

export const inboxApi = {
  list: () => api.get<NotificationItem[]>('/notifications'),
  read: (id: string) => api.post<void>(`/notifications/${id}/read`),
  readAll: () => api.post<void>('/notifications/read-all'),
}
