export type SpeakResult = 'speaking' | 'unavailable' | 'no-korean-voice'

type VoiceLike = Pick<SpeechSynthesisVoice, 'lang' | 'name' | 'localService'>

/**
 * 기기에 있는 한국어 음성 중 가장 사람 같은 것을 고른다 (목록의 첫 음성은 기계음이 강한 옛 음성인 경우가 많다).
 * - 엣지의 신경망 음성(이름에 Natural/Online), 맥·iOS 의 향상된·프리미엄 음성, 크롬의 Google 음성 순
 * - 같은 점수면 목록 순서 그대로. 읽을 문장은 브라우저가 처리하며 우리 서버로 보내지 않는다
 */
export function pickKoreanVoice<V extends VoiceLike>(voices: readonly V[]): V | undefined {
  const score = (v: VoiceLike) => {
    const name = (v.name ?? '').toLowerCase()
    if (/natural|online/.test(name)) return 4
    if (/premium|enhanced|프리미엄|향상/.test(name)) return 3
    if (name.includes('google')) return 2
    if (/siri/.test(name)) return 2
    return v.localService === false ? 1 : 0
  }
  let best: V | undefined
  for (const v of voices) {
    if (!(v.lang ?? '').toLowerCase().startsWith('ko')) continue
    if (!best || score(v) > score(best)) best = v
  }
  return best
}

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
    const voice = pickKoreanVoice(synth.getVoices())
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
    const korean = pickKoreanVoice(voices)
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
