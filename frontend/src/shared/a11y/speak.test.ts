import { afterEach, expect, it, vi } from 'vitest'
import { pickKoreanVoice, speakKorean, stopSpeaking } from './speak'

afterEach(() => vi.unstubAllGlobals())

it('한국어 음성이 없으면 읽기를 시작하지 않는다', () => {
  const speak = vi.fn()
  vi.stubGlobal('window', {
    speechSynthesis: { getVoices: () => [{ lang: 'en-US' }], speak, cancel: vi.fn() },
    SpeechSynthesisUtterance: class {},
  })
  expect(speakKorean('안녕하세요', 1, vi.fn())).toBe('no-korean-voice')
  expect(speak).not.toHaveBeenCalled()
})

it('한국어 음성과 설정한 속도로 읽고 중지할 수 있다', () => {
  const voice = { lang: 'ko-KR' }
  const speak = vi.fn()
  const cancel = vi.fn()
  class Utterance {
    text: string
    constructor(text: string) { this.text = text }
  }
  vi.stubGlobal('window', {
    speechSynthesis: { getVoices: () => [voice], speak, cancel },
    SpeechSynthesisUtterance: Utterance,
  })
  vi.stubGlobal('SpeechSynthesisUtterance', Utterance)
  expect(speakKorean('설정. 글자 크기', 0.8, vi.fn())).toBe('speaking')
  expect(speak).toHaveBeenCalledWith(expect.objectContaining({
    text: '설정. 글자 크기', lang: 'ko-KR', rate: 0.8, voice,
  }))
  stopSpeaking()
  expect(cancel).toHaveBeenCalledTimes(2)
})

it('가장 사람 같은 한국어 음성을 고른다 — 신경망 > 향상된 > Google > 기본', () => {
  const v = (name: string, lang = 'ko-KR', localService = true) => ({ name, lang, localService })
  const yuna = v('Yuna')
  const google = v('Google 한국의', 'ko-KR', false)
  const enhanced = v('Yuna (향상됨)')
  const edge = v('Microsoft SunHi Online (Natural) - Korean (Korea)', 'ko-KR', false)
  expect(pickKoreanVoice([yuna, google])).toBe(google)
  expect(pickKoreanVoice([yuna, google, enhanced])).toBe(enhanced)
  expect(pickKoreanVoice([yuna, enhanced, edge])).toBe(edge)
  expect(pickKoreanVoice([v('Samantha', 'en-US'), yuna])).toBe(yuna)
  expect(pickKoreanVoice([v('Google US English', 'en-US', false)])).toBeUndefined()
})
