/**
 * wellbeing API (C11 사회적 관계 지수·자가평가·WHO-5) — 타입은 백엔드 OpenAPI에서 생성 (shared/api/types.ts).
 */
import { api } from '@/shared/api/client'
import type { Schema } from '@/shared/api/types'

export type RelationIndex = Schema<'RelationIndexOut'>
export type RelationFactor = Schema<'RelationFactor'>
export type RelationLevel = RelationIndex['level']
export type MoodLevel = Schema<'MoodOut'>['level']
export type AssessmentKind = Schema<'AssessmentIn'>['kind']
export type AssessmentForm = Schema<'AssessmentFormOut'>
export type AssessmentResult = Schema<'AssessmentResultOut'>
export type Who5Status = Schema<'Who5StatusOut'>

export const wellbeingApi = {
  relationIndex: () => api.get<RelationIndex>('/me/relation-index'),
  history: () => api.get<AssessmentResult[]>('/me/self-assessment'),
  /** WHO-5를 할 때인지 — 4주가 지났으면 서버가 알림함에도 한 번 쌓는다 */
  who5Status: () => api.get<Who5Status>('/me/who5'),
  form: (kind: AssessmentKind) => api.get<AssessmentForm>(`/me/self-assessment/${kind}`),
  submit: (kind: AssessmentKind, answers: number[]) =>
    api.post<AssessmentResult>('/me/self-assessment', { kind, answers } satisfies Schema<'AssessmentIn'>),
  /** 마음 건강 기록(민감정보) 동의·철회 — 철회하면 서버가 지금까지의 점검 기록을 지운다 (B6) */
  setHealthConsent: (agreed: boolean) =>
    api.put<Schema<'HealthConsentOut'>>('/me/self-assessment/consent', { agreed } satisfies Schema<'HealthConsentIn'>),
}
