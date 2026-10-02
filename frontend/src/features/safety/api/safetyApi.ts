/** 안전 API — 타입은 백엔드 OpenAPI에서 생성 (shared/api/types.ts) */
import { api } from '@/shared/api/client'
import type { Schema } from '@/shared/api/types'

export type ReasonOption = Schema<'ReasonOption'>
export type BlockedUser = Schema<'BlockedUser'>
/** 메시지에 붙는 경고 (chat 응답에 포함되어 온다) */
export type RiskWarningData = Schema<'RiskWarning'>

export const safetyApi = {
  reasons: () => api.get<ReasonOption[]>('/safety/report-reasons'),
  report: (targetUserId: string, reason: string, messageId?: number) =>
    api.post<Schema<'ReportResult'>>('/safety/reports', {
      target_user_id: targetUserId,
      reason,
      message_id: messageId ?? null,
      also_block: true,
    } satisfies Schema<'ReportCreate'>),
  blocks: () => api.get<BlockedUser[]>('/safety/blocks'),
  block: (userId: string) =>
    api.post<void>('/safety/blocks', { user_id: userId } satisfies Schema<'BlockCreate'>),
  unblock: (userId: string) => api.delete<void>(`/safety/blocks/${userId}`),
}
