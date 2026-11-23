/**
 * brain API (인지 훈련 — 보고서 3.1 '기억력·주의집중 향상 게임') — 타입은 백엔드 OpenAPI에서 생성 (shared/api/types.ts).
 * 게임 자체는 화면에서 돌고, 서버는 기록(연속 일수·이번 주·최고 기록)만.
 */
import { api } from '@/shared/api/client'
import type { Schema } from '@/shared/api/types'

export type BrainGame = Schema<'BrainResultIn'>['game']
export type BrainStats = Schema<'BrainStatsOut'>

export const brainApi = {
  stats: () => api.get<BrainStats>('/brain/stats'),
  submit: (r: Schema<'BrainResultIn'>) => api.post<BrainStats>('/brain/results', r),
}
