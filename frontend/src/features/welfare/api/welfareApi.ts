/**
 * welfare API (C7 가까운 복지시설) — 백엔드가 아직 없어 계약은 shared/api/draft.ts (데모 서버만 응답).
 * 백엔드: integrations/public_data (공공데이터포털 노인복지시설) + PostGIS 반경 검색
 */
import { api } from '@/shared/api/client'
import type { WelfareCenterOut, WelfareKind } from '@/shared/api/draft'

export type { WelfareKind } from '@/shared/api/draft'
export type WelfareCenter = WelfareCenterOut

export const welfareApi = {
  nearby: (kind: WelfareKind | 'all') => api.get<WelfareCenter[]>(`/welfare/nearby?kind=${kind}`),
  center: (id: string) => api.get<WelfareCenter>(`/welfare/${id}`),
}
