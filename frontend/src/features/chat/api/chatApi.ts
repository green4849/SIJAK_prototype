/** chat API — 타입은 백엔드 OpenAPI에서 생성 (shared/api/types.ts) */
import { api } from '@/shared/api/client'
import type { Schema } from '@/shared/api/types'

export type ChatPeer = Schema<'ChatPeer'>
/** blocked: 내가 차단했거나 차단당함 → 보내기 불가 */
export type ChatRoomData = Schema<'RoomOut'>
/** warning: 위험 대화 경고 — 받은 메시지에만 (표시는 safety feature가 담당, 페이지에서 조합) */
export type ChatMessageData = Schema<'MessageOut'>

export const chatApi = {
  rooms: () => api.get<ChatRoomData[]>('/chats'),
  room: (roomId: string) => api.get<ChatRoomData>(`/chats/${roomId}`),
  openWith: (userId: string) => api.post<ChatRoomData>(`/chats/with/${userId}`),
  messages: (roomId: string, after = 0) =>
    api.get<ChatMessageData[]>(`/chats/${roomId}/messages?after=${after}`),
  sendText: (roomId: string, text: string) =>
    api.post<ChatMessageData>(`/chats/${roomId}/messages`, { text } satisfies Schema<'TextMessageCreate'>),
  sendVoice: (roomId: string, audio: Blob, durationSec: number) => {
    const form = new FormData()
    const ext = audio.type.includes('mp4') ? 'm4a' : audio.type.includes('ogg') ? 'ogg' : 'webm'
    form.append('audio', audio, `voice.${ext}`)
    form.append('duration_sec', String(durationSec))
    return api.post<ChatMessageData>(`/chats/${roomId}/voice`, form)
  },
  voice: (audioUrl: string) => api.blob(audioUrl),
}
