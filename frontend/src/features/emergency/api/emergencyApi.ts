/**
 * emergency API (C10 긴급 도움·보호자) — 백엔드가 아직 없어 계약은 shared/api/draft.ts (데모 서버만 응답).
 */
import { api } from '@/shared/api/client'
import type { GuardianIn, GuardianOut, SosOut } from '@/shared/api/draft'

export type Guardian = GuardianOut
export type SosResult = SosOut

export const emergencyApi = {
  guardians: () => api.get<Guardian[]>('/me/guardians'),
  addGuardian: (g: GuardianIn) => api.post<Guardian>('/me/guardians', g),
  removeGuardian: (id: string) => api.delete<void>(`/me/guardians/${id}`),
  sos: () => api.post<SosResult>('/emergency/sos'),
}
