/** notification API (C12) — 알림 받는 방식. 실제 발송은 C4 */
import { api } from '@/shared/api/client'
import type { Schema } from '@/shared/api/types'

export type NotificationPrefs = Schema<'NotificationPrefsOut'>
export type TimeSlot = NotificationPrefs['recommend_times'][number]

export const notificationApi = {
  get: () => api.get<NotificationPrefs>('/notifications/settings'),
  update: (body: Schema<'NotificationPrefsUpdate'>) =>
    api.put<NotificationPrefs>('/notifications/settings', body),
}
