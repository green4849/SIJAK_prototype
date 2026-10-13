/**
 * admin API (B7 운영자·복지기관 화면) — 백엔드가 아직 없어 계약은 shared/api/draft.ts (데모 서버만 응답).
 * 실서비스: 운영자 권한(역할) 확인 필수 — 데모는 로그인만 확인.
 */
import { api } from '@/shared/api/client'
import type { AdminCaseOut, AdminWatchOut, CaseAction } from '@/shared/api/draft'

export type { CaseAction, CaseStatus } from '@/shared/api/draft'
export type AdminCase = AdminCaseOut
export type AdminWatch = AdminWatchOut

export const adminApi = {
  cases: () => api.get<AdminCase[]>('/admin/cases'),
  act: (id: string, action: CaseAction) => api.post<AdminCase>(`/admin/cases/${id}/action`, { action }),
  watch: () => api.get<AdminWatch[]>('/admin/watch'),
}
