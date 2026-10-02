/** chat 백엔드 계약 — backend/app/domains/chat/schemas.py 와 1:1 */
import { api } from '@/shared/api/client'

export interface ChatPeer {
  user_id: string
  name: string
  age: number
  region_name: string
}

export interface ChatRoomData {
  id: string
  peer: ChatPeer
  last_message: string | null
  last_message_at: string | null
  unread: number
  /** 내가 차단했거나 차단당함 → 보내기 불가 */
  blocked: boolean
}

export interface ChatMessageData {
  id: number
  sender_id: string
  mine: boolean
  kind: 'text' | 'voice'
  body: string
  duration_sec: number | null
  audio_url: string | null
  created_at: string
  /** 위험 대화 경고 — 받은 메시지에만 (표시는 safety feature가 담당, 페이지에서 조합) */
  warning: { level: number; reasons: string[] } | null
}

export const chatApi = {
  rooms: () => api.get<ChatRoomData[]>('/chats'),
  room: (roomId: string) => api.get<ChatRoomData>(`/chats/${roomId}`),
  openWith: (userId: string) => api.post<ChatRoomData>(`/chats/with/${userId}`),
  messages: (roomId: string, after = 0) =>
    api.get<ChatMessageData[]>(`/chats/${roomId}/messages?after=${after}`),
  sendText: (roomId: string, text: string) =>
    api.post<ChatMessageData>(`/chats/${roomId}/messages`, { text }),
  sendVoice: (roomId: string, audio: Blob, durationSec: number) => {
    const form = new FormData()
    const ext = audio.type.includes('mp4') ? 'm4a' : audio.type.includes('ogg') ? 'ogg' : 'webm'
    form.append('audio', audio, `voice.${ext}`)
    form.append('duration_sec', String(durationSec))
    return api.post<ChatMessageData>(`/chats/${roomId}/voice`, form)
  },
  voice: (audioUrl: string) => api.blob(audioUrl),
}
