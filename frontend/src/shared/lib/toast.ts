/**
 * A4 — 동작 후 피드백 저장소 (화면은 shared/ui/Toast 의 ToastHost)
 *  - 한 번에 하나: 새 토스트가 이전 것을 바꿔치기 (쌓이지 않음)
 *  - 4초 뒤 사라짐
 *  - 성공 시 짧은 진동 (설정에서 끌 수 있음, 지원 기기만)
 */
import { loadPrefs } from '@/shared/a11y/preferences'

export type ToastTone = 'success' | 'info' | 'error'
export interface ToastItem {
  id: number
  message: string
  tone: ToastTone
}

const DURATION_MS = 4000
let current: ToastItem | null = null
let seq = 0
let timer: number | undefined
const listeners = new Set<() => void>()

function emit() {
  listeners.forEach((fn) => fn())
}

function vibrate(tone: ToastTone) {
  if (!loadPrefs().vibration || typeof navigator.vibrate !== 'function') return
  navigator.vibrate(tone === 'error' ? [60, 60, 60] : 40)
}

export function toast(message: string, tone: ToastTone = 'success') {
  // 같은 문구가 이미 떠 있으면 시간만 연장
  if (!(current && current.message === message && current.tone === tone)) {
    current = { id: ++seq, message, tone }
    vibrate(tone)
  }
  window.clearTimeout(timer)
  timer = window.setTimeout(dismissToast, DURATION_MS)
  emit()
}

export function dismissToast() {
  current = null
  emit()
}

export function subscribeToast(fn: () => void) {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

export const currentToast = () => current
