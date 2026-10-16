/** wellbeing feature 공개 API (C11 사회적 관계 지수·자가평가 — 화면·데모만, 백엔드 없음) */
export type { AssessmentKind, RelationLevel } from './api/wellbeingApi'
export { AssessmentCards, AssessmentFlow } from './components/Assessment'
export { RelationSummary } from './components/RelationSummary'
export { weatherLabel } from './components/weather'
export { useRelationIndex } from './hooks/useWellbeing'
