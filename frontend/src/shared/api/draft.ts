/**
 * 임시 API 계약 — 백엔드가 아직 없는 기능 (데모 가짜 서버만 응답한다).
 *
 * 원칙(dev-order §3-6)은 "API 타입은 백엔드 OpenAPI에서 생성"이다.
 * 아래 기능들은 화면·시연 데이터를 먼저 만들기로 해서, 계약을 여기에 손으로 적어 둔다.
 * 백엔드를 붙일 때: 같은 모양으로 backend 스키마를 만들고 → gen:api → 쓰는 곳을 Schema<'…'>로 바꾸고 → 여기서 지운다.
 * 목록·꽂는 곳: docs/deferred.md §7
 */

// ---------- C8 AI 말동무 — /companion ----------

/** 말동무 답에 붙는 동네 활동 추천 (보고서 4.5 RAG: 지역 복지 정보 컨텍스트) */
export interface CompanionSuggestion {
  activity_id: string
  title: string
  schedule_text: string
}

export interface CompanionMessage {
  id: number
  role: 'user' | 'assistant'
  text: string
  /** user 메시지: 말로 했는지 (음성은 STT 결과가 text) */
  input_type: 'text' | 'voice'
  created_at: string
  suggestion: CompanionSuggestion | null
  /**
   * 응답 안전성 검증(가드레일)이 걸린 답 — 화면이 안내를 덧붙인다
   *  medical: 의료 조언 대신 의사 상담 권유 / crisis: 위기 상담 전화 안내
   */
  safety: 'medical' | 'crisis' | null
}

export interface CompanionSendIn {
  input_type: 'text' | 'voice'
  /** 글로 보낼 때만. 말로 할 때는 녹음 파일(데모는 생략) → 서버가 받아쓴다 */
  text?: string
}

export interface CompanionReplyOut {
  /** 방금 보낸 말(받아쓴 글 포함) + 말동무 답 */
  messages: CompanionMessage[]
}

export interface CompanionInfoOut {
  name: string
  /** 입력줄 위 '이런 말로 시작해 보세요' 버튼 */
  starters: string[]
}

// ---------- C11 마음 건강 — /me/isolation-index, /me/self-assessment ----------

/** 고립 지수 단계 (보고서 4.5.3: 0~30 정상 · 30~60 주의 · 60~80 위험 · 80~ 긴급) */
export type IsolationLevel = 'normal' | 'caution' | 'risk' | 'urgent'

export interface IsolationFactor {
  code: 'activity' | 'communication' | 'emotion' | 'social' | 'responsiveness'
  label: string
  /** 0~100, 높을수록 좋음 */
  score: number
}

export interface IsolationIndexOut {
  /** 0~100, 높을수록 고립 위험 */
  score: number
  level: IsolationLevel
  factors: IsolationFactor[]
  /** 지난 주들 → 이번 주 (마지막이 지금) */
  weekly: { label: string; score: number }[]
  updated_at: string
}

export type AssessmentKind = 'phq9' | 'gad7'

export interface AssessmentFormOut {
  kind: AssessmentKind
  title: string
  /** '지난 2주 동안 …' */
  lead: string
  questions: { id: number; text: string }[]
  options: { value: number; label: string }[]
}

export interface AssessmentIn {
  kind: AssessmentKind
  answers: number[]
}

export interface AssessmentResultOut {
  id: number
  kind: AssessmentKind
  title: string
  score: number
  max_score: number
  level: 'minimal' | 'mild' | 'moderate' | 'severe'
  level_label: string
  advice: string
  /** PHQ-9 9번(죽음·자해 생각)에 '있음' → 상담 전화 안내 */
  crisis: boolean
  created_at: string
}

// ---------- C10 긴급 도움·보호자 — /me/guardians, /emergency/sos ----------

export interface GuardianOut {
  id: string
  name: string
  relation: string
  /** 010-****-5678 */
  phone_masked: string
  /** 전화 걸기용 (본인 화면에서만) */
  phone: string
}

export interface GuardianIn {
  name: string
  relation: string
  phone: string
}

export interface SosOut {
  id: string
  created_at: string
  /** 알린 사람들 (보호자 + 담당 복지사) */
  notified: { name: string; relation: string }[]
}
