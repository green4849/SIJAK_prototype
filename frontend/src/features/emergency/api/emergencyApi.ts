/** emergency API (C10 긴급 도움·보호자) — 타입은 백엔드 OpenAPI에서 생성 (shared/api/types.ts) */
import { api } from '@/shared/api/client'
import type { Schema } from '@/shared/api/types'

export type Guardian = Schema<'GuardianOut'>
export type GuardianIn = Schema<'GuardianIn'>
export type SosResult = Schema<'SosOut'>

export const emergencyApi = {
  guardians: () => api.get<Guardian[]>('/me/guardians'),
  addGuardian: (g: GuardianIn) => api.post<Guardian>('/me/guardians', g),
  removeGuardian: (id: string) => api.delete<void>(`/me/guardians/${id}`),
  sos: () => api.post<SosResult>('/emergency/sos'),
}
