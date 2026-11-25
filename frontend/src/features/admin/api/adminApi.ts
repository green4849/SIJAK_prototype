/**
 * admin API (B7 운영자·복지기관 화면) — 타입은 백엔드 OpenAPI에서 생성 (shared/api/types.ts).
 * 서버는 운영자 역할(users.role='operator')만 받는다 — 역할은 backend `scripts.set_role` 로. 데모는 로그인만 확인.
 */
import { api } from '@/shared/api/client'
import type { Schema } from '@/shared/api/types'

export type AdminCase = Schema<'AdminCaseOut'>
export type AdminWatch = Schema<'AdminWatchOut'>
export type CaseStatus = AdminCase['status']
export type CaseAction = Schema<'CaseActionIn'>['action']

export const adminApi = {
  cases: () => api.get<AdminCase[]>('/admin/cases'),
  act: (id: string, action: CaseAction) =>
    api.post<AdminCase>(`/admin/cases/${id}/action`, { action } satisfies Schema<'CaseActionIn'>),
  context: (id: string) => api.get<Schema<'CaseMessageOut'>[]>(`/admin/cases/${id}/context`),
  watch: () => api.get<AdminWatch[]>('/admin/watch'),
}
