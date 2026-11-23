/**
 * welfare API (C7 가까운 복지시설) — 타입은 백엔드 OpenAPI에서 생성 (shared/api/types.ts).
 * 백엔드: domains/welfare (반경 검색) + scripts/import_welfare (공공데이터포털, 키 필요).
 * 키가 없으면 시드의 예시 시설만 있고, 응답의 sample_note 로 '예시 정보' 안내를 붙인다.
 */
import { api } from '@/shared/api/client'
import type { Schema } from '@/shared/api/types'

export type WelfareCenter = Schema<'WelfareCenterOut'>
export type WelfareKind = WelfareCenter['kind']

export const welfareApi = {
  nearby: (kind: WelfareKind | 'all') => api.get<WelfareCenter[]>(`/welfare/nearby?kind=${kind}`),
  center: (id: string) => api.get<WelfareCenter>(`/welfare/${id}`),
}
