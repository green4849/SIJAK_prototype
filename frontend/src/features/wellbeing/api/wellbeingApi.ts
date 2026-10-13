/**
 * wellbeing API (C11 고립 지수·자가평가) — 백엔드가 아직 없어 계약은 shared/api/draft.ts (데모 서버만 응답).
 */
import { api } from '@/shared/api/client'
import type {
  AssessmentFormOut,
  AssessmentIn,
  AssessmentKind,
  AssessmentResultOut,
  IsolationIndexOut,
} from '@/shared/api/draft'

export type { AssessmentKind, IsolationLevel } from '@/shared/api/draft'
export type IsolationIndex = IsolationIndexOut
export type AssessmentForm = AssessmentFormOut
export type AssessmentResult = AssessmentResultOut

export const wellbeingApi = {
  isolationIndex: () => api.get<IsolationIndex>('/me/isolation-index'),
  history: () => api.get<AssessmentResult[]>('/me/self-assessment'),
  form: (kind: AssessmentKind) => api.get<AssessmentForm>(`/me/self-assessment/${kind}`),
  submit: (kind: AssessmentKind, answers: number[]) =>
    api.post<AssessmentResult>('/me/self-assessment', { kind, answers } satisfies AssessmentIn),
}
