import { createPolledStore } from '@/shared/lib/createPolledStore'
import { inboxApi, type NotificationItem } from '../api/inboxApi'

/** 알림 목록 — 마이페이지 '새 소식 N개'와 알림함이 같은 요청 하나를 나눠 쓴다 (1분마다) */
const store = createPolledStore(inboxApi.list, 60_000)

export const useNotifications = store.useValue

export function useUnreadNotifications(): number | null {
  const list = store.useValue()
  return list ? list.filter((n) => !n.read).length : null
}

export async function markRead(n: NotificationItem) {
  if (n.read) return
  await inboxApi.read(n.id).catch(() => undefined)
  void store.refresh()
}

export async function markAllRead() {
  await inboxApi.readAll().catch(() => undefined)
  void store.refresh()
}
