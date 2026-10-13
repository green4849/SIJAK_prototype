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
