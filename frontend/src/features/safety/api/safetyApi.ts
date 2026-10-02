/** 안전 백엔드 계약 — backend/app/domains/risk/schemas.py 와 1:1 */
import { api } from '@/shared/api/client'

export interface ReasonOption {
  code: string
  label: string
}

export interface BlockedUser {
  user_id: string
  name: string
}

/** 메시지에 붙는 경고 (chat 응답에 포함되어 온다) */
export interface RiskWarningData {
  level: number
  reasons: string[]
}

export const safetyApi = {
  reasons: () => api.get<ReasonOption[]>('/safety/report-reasons'),
  report: (targetUserId: string, reason: string, messageId?: number) =>
    api.post<{ blocked: boolean }>('/safety/reports', {
      target_user_id: targetUserId,
      reason,
      message_id: messageId ?? null,
      also_block: true,
    }),
  blocks: () => api.get<BlockedUser[]>('/safety/blocks'),
  block: (userId: string) => api.post<void>('/safety/blocks', { user_id: userId }),
  unblock: (userId: string) => api.delete<void>(`/safety/blocks/${userId}`),
}
