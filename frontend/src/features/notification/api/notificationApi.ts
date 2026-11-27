/** notification API — 알림 받는 방식(C12), 휴대폰 알림 구독(C4) */
import { api } from '@/shared/api/client'
import type { Schema } from '@/shared/api/types'

export type NotificationPrefs = Schema<'NotificationPrefsOut'>
export type TimeSlot = NotificationPrefs['recommend_times'][number]
export type PushConfig = Schema<'PushConfigOut'>
export type PushTest = Schema<'PushTestOut'>

export const notificationApi = {
  get: () => api.get<NotificationPrefs>('/notifications/settings'),
  update: (body: Schema<'NotificationPrefsUpdate'>) =>
    api.put<NotificationPrefs>('/notifications/settings', body),
  pushConfig: () => api.get<PushConfig>('/notifications/push'),
  pushSubscribe: (body: Schema<'PushSubscriptionIn'>) => api.put<void>('/notifications/push/subscription', body),
  pushTest: () => api.post<PushTest>('/notifications/push/test'),
}
