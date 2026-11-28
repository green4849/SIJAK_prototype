import { afterEach, expect, it, vi } from 'vitest'
import { speakKorean, stopSpeaking } from './speak'

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
