/** points API (C12) — 포인트·미션. 타입은 백엔드 OpenAPI에서 생성 (shared/api/types.ts) */
import { api } from '@/shared/api/client'
import type { Schema } from '@/shared/api/types'

/** 잔액 + 지금 적용되는 규칙 (안내 문구는 이 값으로 만든다 — 금액을 화면에 박아 두지 않음) */
export type PointSummary = Schema<'PointSummaryOut'>
export type PointEntry = Schema<'PointEntryOut'>
export type Mission = Schema<'MissionOut'>

export const pointsApi = {
  summary: () => api.get<PointSummary>('/points'),
  history: () => api.get<PointEntry[]>('/points/history'),
  missions: () => api.get<Mission[]>('/missions'),
  claim: (code: Mission['code']) => api.post<Mission>(`/missions/${code}/claim`),
}

/** 친구 신청 버튼에 붙일 가격 — '무료' / '30P' (아직 모르면 undefined → 가격 없이 표시) */
export function friendRequestPrice(s: PointSummary | null): string | undefined {
  if (!s) return undefined
  return s.next_request_free ? '무료' : `${s.friend_request_cost}P`
}
