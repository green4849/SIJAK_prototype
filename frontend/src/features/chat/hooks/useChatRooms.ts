import { useAsync } from '@/shared/lib/useAsync'
import { chatApi } from '../api/chatApi'
import { usePolling } from './usePolling'

const ROOMS_POLL_MS = 10_000

/** 대화 목록 — 새 메시지·안 읽은 개수를 위해 10초마다 갱신 */
export function useChatRooms() {
  const state = useAsync(() => chatApi.rooms(), [])
  usePolling(async () => {
    state.setData(await chatApi.rooms())
  }, ROOMS_POLL_MS)
  return state
}
