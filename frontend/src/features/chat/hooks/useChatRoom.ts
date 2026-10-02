import { useAsync } from '@/shared/lib/useAsync'
import { chatApi } from '../api/chatApi'

export function useChatRoom(roomId: string) {
  return useAsync(() => chatApi.room(roomId), [roomId])
}

/** 친구 → 대화방 열기 (없으면 만들고 방 id 반환) */
export function useOpenChatWith(userId: string) {
  return useAsync(() => chatApi.openWith(userId), [userId])
}
