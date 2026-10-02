import { createPolledStore } from '@/shared/lib/createPolledStore'
import { friendApi } from '../api/friendApi'

const RECEIVED_POLL_MS = 30_000

/** 나에게 온 친구 신청 수 — 하단 '친구' 탭·홈 카드 배지용 */
const store = createPolledStore(() => friendApi.received().then((r) => r.length), RECEIVED_POLL_MS)

export const useReceivedCount = store.useValue
export const refreshReceivedCount = store.refresh
