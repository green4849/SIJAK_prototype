import { createPolledStore } from '@/shared/lib/createPolledStore'
import { chatApi } from '../api/chatApi'

const UNREAD_POLL_MS = 15_000

/** 전체 안 읽은 메시지 수 (차단된 대화 제외) — 하단 탭·홈 카드 배지용 */
const store = createPolledStore(
  () =>
    chatApi.rooms().then((rooms) => rooms.reduce((n, r) => n + (r.blocked ? 0 : r.unread), 0)),
  UNREAD_POLL_MS,
)

export const useUnreadTotal = store.useValue
/** 대화를 읽은 뒤 등 즉시 갱신이 필요할 때 */
export const refreshUnreadTotal = store.refresh
