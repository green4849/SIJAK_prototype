/**
 * brain API (인지 훈련 — 보고서 3.1 '기억력·주의집중 향상 게임') — 백엔드가 아직 없어 계약은 shared/api/draft.ts.
 * 게임 자체는 화면에서 돌고, 서버는 기록(연속 일수·이번 주·최고 기록)만.
 */
import { api } from '@/shared/api/client'
import type { BrainResultIn, BrainStatsOut } from '@/shared/api/draft'

export type { BrainGame } from '@/shared/api/draft'
export type BrainStats = BrainStatsOut

export const brainApi = {
  stats: () => api.get<BrainStats>('/brain/stats'),
  submit: (r: BrainResultIn) => api.post<BrainStats>('/brain/results', r),
}
