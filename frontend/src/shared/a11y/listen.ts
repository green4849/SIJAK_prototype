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

/**
 * 결과 조각들을 한 문장으로 — 데스크톱 크롬은 조각이 이어지는 말이지만,
 * 안드로이드 크롬은 조각마다 앞말을 누적해 다시 보내기도 한다 ('오늘은' → '오늘은 날씨가').
 * 앞 조각을 포함하는 조각은 바꿔 끼우고, 이미 들어 있는 조각은 건너뛴다.
 */
export function joinSegments(segments: string[]): string {
  let text = ''
  for (const raw of segments) {
    const seg = raw.trim()
    if (!seg) continue
    if (seg.startsWith(text)) text = seg
    else if (!text.endsWith(seg)) text = `${text} ${seg}`
  }
  return text.trim()
}

/** 듣기 시작. 돌려받은 함수를 부르면 멈춘다 */
export function listen({ onText, onError }: ListenHandlers): () => void {
  const Ctor = ctor()
  if (!Ctor) {
    onError('이 기기에서는 말로 하기를 쓸 수 없어요. 글로 써 주세요.')
    return () => {}
  }
  let stopped = false
  let before = '' // 크롬이 스스로 끝낸 앞 회차까지 알아들은 말
  let current = ''
  let restarts = 0 // 이어 듣기 횟수 — 혹시 바로바로 끝나는 기기에서 끝없이 돌지 않게
  let rec: Recognition

  function begin() {
    rec = new Ctor!()
    rec.lang = 'ko-KR'
    rec.continuous = true // 잠깐 쉬어도 끊지 않는다 (어르신은 말 사이가 길다)
    rec.interimResults = true // 말하는 중에도 글을 보여 준다
    rec.onresult = (e) => {
      const segments: string[] = []
      for (let i = 0; i < e.results.length; i++) segments.push(e.results[i][0].transcript)
      current = joinSegments(segments)
      onText(joinSegments([before, current]))
    }
    rec.onerror = (e) => {
      // no-speech(아무 말 없음)·aborted(우리가 멈춤)는 화면에서 따로 다룬다
      if (e.error === 'no-speech' || e.error === 'aborted') return
      stopped = true
      onError(ERROR_TEXT[e.error] ?? '잘 못 들었어요. 한 번 더 말씀해 주세요.')
    }
    // 크롬은 몇 초 조용하면 스스로 끝낸다 → '다 말했어요'를 누를 때까지 이어서 듣는다
    rec.onend = () => {
      if (stopped || ++restarts > 30) return
      before = joinSegments([before, current])
      current = ''
      try {
        begin()
      } catch {
        /* 다시 못 열면 그대로 둔다 — 알아들은 말은 남아 있다 */
      }
    }
    rec.start()
  }

  try {
    begin()
  } catch {
    onError('잘 못 들었어요. 한 번 더 말씀해 주세요.')
  }
  return () => {
    stopped = true
    rec.onresult = null
    rec.onerror = null
    rec.onend = null
    try {
      rec.abort()
    } catch {
      /* 이미 멈춤 */
    }
  }
}
