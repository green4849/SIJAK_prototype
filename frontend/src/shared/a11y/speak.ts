/**
 * 소리 내어 읽기 — 브라우저 내장 음성 합성(Web Speech API).
 * 서버 TTS(C2)를 붙이기 전까지 화면 글을 읽어 주는 데 쓴다. 지원하지 않는 기기에서는 아무 일도 하지 않는다.
 */

export const canSpeak = () => typeof window !== 'undefined' && 'speechSynthesis' in window

function koreanVoice(): SpeechSynthesisVoice | undefined {
  return window.speechSynthesis.getVoices().find((v) => v.lang.toLowerCase().startsWith('ko'))
}

/** 읽기 시작 (이미 읽는 중이면 끊고 새로). 끝나면 onEnd */
export function speak(text: string, onEnd?: () => void) {
  if (!canSpeak()) return
  try {
    const synth = window.speechSynthesis
    synth.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.lang = 'ko-KR'
    u.rate = 0.9 // 어르신 듣기 편하게 조금 천천히
    const voice = koreanVoice()
    if (voice) u.voice = voice
    if (onEnd) {
      u.onend = onEnd
      u.onerror = onEnd
    }
    synth.speak(u)
  } catch {
    onEnd?.()
  }
}

export function stopSpeaking() {
  if (canSpeak()) window.speechSynthesis.cancel()
}
