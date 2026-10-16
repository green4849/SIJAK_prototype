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

// ---------- C11 마음 건강 — /me/relation-index, /me/self-assessment ----------

/** 사회적 관계 지수 단계 — 보고서 4.5.3 고립 지수 단계를 뒤집음: 70~100 정상 · 40~70 주의 · 20~40 위험 · 0~20 긴급 */
export type RelationLevel = 'normal' | 'caution' | 'risk' | 'urgent'

export interface RelationFactor {
  code: 'activity' | 'communication' | 'emotion' | 'social' | 'responsiveness'
  label: string
  /** 0~100, 높을수록 좋음 */
  score: number
}

export interface RelationIndexOut {
  /** 사회적 관계 지수 0~100, 높을수록 좋음 (= 100 − 보고서 고립 지수 II) */
  score: number
  level: RelationLevel
  factors: RelationFactor[]
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

// ---------- C7 가까운 복지시설 — /welfare (공공데이터포털 노인복지시설 연동 자리) ----------

export type WelfareKind = 'welfare_center' | 'senior_center' | 'kyungrodang'

export interface WelfareProgramOut {
  id: string
  title: string
  schedule_text: string
  /** '무료' · '월 1만 원' */
  fee_text: string
  /** 남은 자리 (모르면 null) */
  seats_left: number | null
}

export interface WelfareRoomOut {
  name: string
  capacity: number
  /** '평일 오후 비어 있어요' */
  available_text: string
}

export interface WelfareCenterOut {
  id: string
  name: string
  kind: WelfareKind
  kind_label: string
  address: string
  phone: string
  /** 0.5km 단위 */
  distance_km: number
  open_hours: string
  programs: WelfareProgramOut[]
  /** 모임 공간 대여 */
  rooms: WelfareRoomOut[]
}

// ---------- 인지 훈련 (보고서 3.1 '인지 강화 기능') — /brain ----------

export type BrainGame = 'match' | 'calc'

export interface BrainStatsOut {
  /** 연속으로 한 날 */
  streak_days: number
  /** 오늘 했는지 */
  today_done: boolean
  /** 이번 주 (월~일) 한 날 — 길이 7, 월요일부터 */
  week: boolean[]
  best: { game: BrainGame; text: string }[]
}

export interface BrainResultIn {
  game: BrainGame
  /** match: 뒤집은 횟수(적을수록 좋음) / calc: 맞힌 개수 */
  score: number
  total: number
}

// ---------- 알림함 (C4 푸시와 같은 소식을 앱 안에 모아 둠) — /notifications ----------

export type NotificationKind = 'friend' | 'activity' | 'safety' | 'wellbeing' | 'welfare' | 'points'

export interface NotificationItemOut {
  id: string
  kind: NotificationKind
  title: string
  body: string
  created_at: string
  read: boolean
  /** 누르면 갈 앱 안 경로 (없으면 null) */
  link: string | null
}

// ---------- B3 회원 탈퇴 — /me/withdraw ----------

export interface WithdrawIn {
  /** 고른 이유 (선택) */
  reason: string | null
}

export interface WithdrawOut {
  /** 이 날 개인정보가 완전히 지워진다 (탈퇴 + 30일) */
  delete_at: string
}

// ---------- B7 운영자(복지기관) 화면 — /admin ----------

export type CaseStatus = 'open' | 'warned' | 'suspended' | 'banned' | 'dismissed'
export type CaseAction = 'warn' | 'suspend' | 'ban' | 'dismiss'

export interface AdminCaseOut {
  id: string
  /** report: 이웃이 신고 / auto: 위험 대화 자동 감지 */
  source: 'report' | 'auto'
  target_id: string
  target_name: string
  reasons: string[]
  /** 문제 메시지 일부 */
  excerpt: string | null
  /** 1 주의 · 2 경고 · 3 위험 */
  level: number
  reports_count: number
  created_at: string
  status: CaseStatus
}

export interface AdminWatchOut {
  user_id: string
  name: string
  age: number
  region_name: string
  /** 사회적 관계 지수 0~100 — 낮을수록 돌봄이 필요 */
  relation_score: number
  /** 마지막 접속 '3일 전' */
  last_seen_text: string
  /** 최근 신호 (예: 말동무 대화에서 외로움 표현 늘어남) */
  signal: string
  guardian_notified: boolean
}
