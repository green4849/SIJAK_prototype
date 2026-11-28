export type SpeakResult = 'speaking' | 'unavailable' | 'no-korean-voice'

/** 시작이와 말동무가 이미 사용하는 음성 지원 확인. */
export const canSpeak = () => typeof window !== 'undefined' && 'speechSynthesis' in window

/** 시작이와 말동무의 기존 읽기 동작. */
export function speak(text: string, onEnd?: () => void) {
  if (!canSpeak()) return
  try {
    const synth = window.speechSynthesis
    synth.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'ko-KR'
    utterance.rate = 0.9
    const voice = synth.getVoices().find((item) => item.lang.toLowerCase().startsWith('ko'))
    if (voice) utterance.voice = voice
    if (onEnd) {
      utterance.onend = onEnd
      utterance.onerror = onEnd
    }
    synth.speak(utterance)
  } catch {
    onEnd?.()
  }
}

/** 브라우저의 음성 합성만 사용한다. 읽을 문장은 외부 서버로 보내지 않는다. */
export function speakKorean(text: string, rate: number, onEnd: () => void): SpeakResult {
  if (!canSpeak() || !('SpeechSynthesisUtterance' in window))
    return 'unavailable'
  try {
    const voices = window.speechSynthesis.getVoices()
    const korean = voices.find((voice) => voice.lang.toLowerCase().startsWith('ko'))
    // 일부 브라우저는 첫 클릭 때 음성 목록을 늦게 채운다. 목록이 비어 있으면 ko-KR 기본 음성으로 시도한다.
    if (voices.length && !korean) return 'no-korean-voice'

    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'ko-KR'
    utterance.rate = rate
    if (korean) utterance.voice = korean
    utterance.onend = onEnd
    utterance.onerror = onEnd
    window.speechSynthesis.speak(utterance)
    return 'speaking'
  } catch {
    return 'unavailable'
  }
}

export function stopSpeaking() {
  if (canSpeak()) window.speechSynthesis.cancel()
}
