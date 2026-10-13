/** wellbeing feature 공개 API (C11 고립 지수·자가평가 — 화면·데모만, 백엔드 없음) */
export type { AssessmentKind, IsolationLevel } from './api/wellbeingApi'
export { AssessmentCards, AssessmentFlow } from './components/Assessment'
export { IsolationSummary } from './components/IsolationSummary'
export { weatherLabel } from './components/weather'
export { useIsolationIndex } from './hooks/useWellbeing'
