/**
 * 시작이 안내의 계약 (C14, docs/tasks/C14-sijagi-guide.md).
 *
 * 답을 만드는 쪽(엔진)과 보여 주는 쪽(화면)을 이 타입으로 나눈다.
 *  - 지금: `localEngine` — 기기 안에서 미리 검수한 안내를 고른다 (서버·AI 없음)
 *  - 나중: 같은 `GuideEngine` 을 서버의 AI가 구현한다. 서버가 돌려줄 수 있는 동작도 아래
 *    `GuideAction` 뿐이라, AI가 화면에 없는 버튼이나 대신 눌러 주는 동작을 지어낼 수 없다.
 */
import type { ScreenId } from './screens'
import type { TargetId } from './targets'

/** 시작이 표정 — 답의 성격에 맞춘다 */
export type Mood = 'hello' | 'happy' | 'think' | 'sorry' | 'care'

/** 같이 가 보기의 한 걸음 — 누르는 것은 언제나 사용자 */
export interface WalkStep {
  /** 이 걸음을 보여 줄 화면들 */
  on: ScreenId[]
  target: TargetId
  /** 짚어 주며 하는 말 */
  say: string
}

export type GuideAction =
  /** 지금 화면에서 어디 있는지 짚어 주기 */
  | { kind: 'show'; label: string; target: TargetId; say: string }
  /** 여러 화면에 걸친 길 — 걸음마다 사용자가 직접 누른다. 첫 걸음을 지금 화면에서 못 찾으면 `via` 로 옮긴다 */
  | { kind: 'walk'; label: string; steps: WalkStep[]; via: string }
  /** 화면 이동만 */
  | { kind: 'go'; label: string; to: string }
  /** 전화 걸기 (기기의 전화 앱이 연다) */
  | { kind: 'call'; label: string; number: string }
  /** 안내 창 안에서 바로 고르는 화면 설정 — 자기 화면에만 영향, 언제든 되돌릴 수 있는 것만 */
  | { kind: 'setting'; which: 'font' | 'contrast' }
  /** 되묻기 — 누르면 그 질문을 한 것으로 */
  | { kind: 'ask'; label: string; question: string }

export interface GuideReply {
  /** 어떤 안내가 골라졌는지 (주제 id, 'screen', 'unknown' …) — 기록·시험용 */
  id: string
  kind: 'answer' | 'screen' | 'safety' | 'boundary' | 'clarify' | 'unknown' | 'chat'
  mood: Mood
  text: string
  /** 차례대로 할 일 (세 줄 이하) */
  steps?: string[]
  actions?: GuideAction[]
  /** 작은 글씨 덧붙임 — 주로 '시연 화면에서는 …' */
  note?: string
  /** 사용자가 "어디 있어?"처럼 되물었을 때 화면이 바로 실행할 동작 */
  run?: GuideAction
}

export interface GuideContext {
  pathname: string
  screen: ScreenId
  /** 화면의 지금 상태 (예: 인증번호 입력 단계) — 화면이 DOM을 보고 넣어 준다 */
  variant: string
  /** 본인 확인을 마치고 들어온 상태인지 */
  signedIn: boolean
  /** 서버 없는 시연 빌드인지 — 시연이라 실제와 다른 점을 숨기지 않으려고 */
  demo: boolean
  /** 바로 앞의 답 — "어디 있어?", "다시 말해 줘" 같은 되물음에 쓴다 */
  last?: GuideReply
}

export interface GuideEngine {
  ask(question: string, context: GuideContext): Promise<GuideReply>
}
