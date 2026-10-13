import { useAsync } from '@/shared/lib/useAsync'
import { chatApi } from '../api/chatApi'

/** 대화 주제 추천 (C12) — 방마다 한 번 불러온다 */
export function useTopics(roomId: string) {
  return useAsync(() => chatApi.topics(roomId), [roomId])
}
