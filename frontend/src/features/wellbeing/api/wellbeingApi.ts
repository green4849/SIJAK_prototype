/**
 * wellbeing API (C11 사회적 관계 지수·자가평가) — 백엔드가 아직 없어 계약은 shared/api/draft.ts (데모 서버만 응답).
 */
import { api } from '@/shared/api/client'
import type {
  AssessmentFormOut,
  AssessmentIn,
  AssessmentKind,
  AssessmentResultOut,
  RelationIndexOut,
} from '@/shared/api/draft'

export type { AssessmentKind, RelationLevel } from '@/shared/api/draft'
export type RelationIndex = RelationIndexOut
export type AssessmentForm = AssessmentFormOut
export type AssessmentResult = AssessmentResultOut

export const wellbeingApi = {
  relationIndex: () => api.get<RelationIndex>('/me/relation-index'),
  history: () => api.get<AssessmentResult[]>('/me/self-assessment'),
  form: (kind: AssessmentKind) => api.get<AssessmentForm>(`/me/self-assessment/${kind}`),
  submit: (kind: AssessmentKind, answers: number[]) =>
    api.post<AssessmentResult>('/me/self-assessment', { kind, answers } satisfies AssessmentIn),
}
