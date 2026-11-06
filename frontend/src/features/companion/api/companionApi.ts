/**
 * companion API (C8 AI 말동무) — 백엔드가 아직 없어 계약은 shared/api/draft.ts (데모 서버만 응답).
 * 백엔드 domains/companion 이 생기면 Schema<'…'>로 바꾼다.
 */
import { api } from '@/shared/api/client'
import type {
  CompanionInfoOut,
  CompanionMessage,
  CompanionReplyOut,
  CompanionSendIn,
} from '@/shared/api/draft'

export type { CompanionMessage, CompanionSuggestion } from '@/shared/api/draft'
export type CompanionInfo = CompanionInfoOut

export const companionApi = {
  info: () => api.get<CompanionInfo>('/companion'),
  messages: () => api.get<CompanionMessage[]>('/companion/messages'),
  sendText: (text: string) =>
    api.post<CompanionReplyOut>('/companion/messages', { input_type: 'text', text } satisfies CompanionSendIn),
  /**
   * 말로 하기 — 기기(브라우저 음성 인식)가 받아쓴 글을 함께 보낸다.
   * 글이 없으면(인식을 못 쓰는 기기) 나중엔 서버가 받아쓰고(C2 STT), 데모 서버는 시연 문장으로 대신한다.
   */
  sendVoice: (text?: string) =>
    api.post<CompanionReplyOut>('/companion/messages', { input_type: 'voice', text } satisfies CompanionSendIn),
}
