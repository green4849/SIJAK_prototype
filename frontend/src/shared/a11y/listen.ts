/**
 * 말 알아듣기 — 브라우저 내장 음성 인식(Web Speech API, speak.ts 와 짝).
 * 크롬은 음성을 구글 서버로 보내 글로 바꿔 온다 → 인터넷이 필요하다.
 * 서버 STT(C2)를 붙이기 전까지 말동무 '말하기'에 쓴다. 지원하지 않는 기기에서는 canListen() 이 false.
 */

interface RecognitionResultList {
  length: number
  [i: number]: { 0: { transcript: string } }
}

interface Recognition {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: ((e: { results: RecognitionResultList }) => void) | null
  onerror: ((e: { error: string }) => void) | null
  onend: (() => void) | null
  start(): void
  stop(): void
  abort(): void
}

type RecognitionCtor = new () => Recognition

function ctor(): RecognitionCtor | undefined {
  if (typeof window === 'undefined') return undefined
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition
}

export const canListen = () => Boolean(ctor())

export interface ListenHandlers {
  /** 지금까지 알아들은 글 전체 (말하는 중에도 계속 바뀐다) */
  onText: (text: string) => void
  /** 마이크를 못 쓰거나 인식이 실패했을 때 — 어르신께 보여 줄 문장 */
  onError: (message: string) => void
}

const ERROR_TEXT: Record<string, string> = {
  'not-allowed': '마이크를 쓸 수 없어요. 글로 써 주세요.',
  'service-not-allowed': '마이크를 쓸 수 없어요. 글로 써 주세요.',
  'audio-capture': '마이크를 찾을 수 없어요. 글로 써 주세요.',
  network: '인터넷이 연결되어야 말을 알아들을 수 있어요.',
}

/** 듣기 시작. 돌려받은 함수를 부르면 멈춘다 */
export function listen({ onText, onError }: ListenHandlers): () => void {
  const Ctor = ctor()
  if (!Ctor) {
    onError('이 기기에서는 말로 하기를 쓸 수 없어요. 글로 써 주세요.')
    return () => {}
  }
  const rec = new Ctor()
  rec.lang = 'ko-KR'
  rec.continuous = true // 잠깐 쉬어도 끊지 않는다 (어르신은 말 사이가 길다)
  rec.interimResults = true // 말하는 중에도 글을 보여 준다
  rec.onresult = (e) => {
    let text = ''
    for (let i = 0; i < e.results.length; i++) text += e.results[i][0].transcript
    onText(text.trim())
  }
  rec.onerror = (e) => {
    // no-speech(아무 말 없음)·aborted(우리가 멈춤)는 화면에서 따로 다룬다
    if (e.error === 'no-speech' || e.error === 'aborted') return
    onError(ERROR_TEXT[e.error] ?? '잘 못 들었어요. 한 번 더 말씀해 주세요.')
  }
  try {
    rec.start()
  } catch {
    onError('잘 못 들었어요. 한 번 더 말씀해 주세요.')
  }
  return () => {
    rec.onresult = null
    rec.onerror = null
    try {
      rec.abort()
    } catch {
      /* 이미 멈춤 */
    }
  }
}
