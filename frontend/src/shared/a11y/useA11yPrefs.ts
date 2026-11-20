import { useSyncExternalStore } from 'react'
import { applyPrefs, loadPrefs, savePrefs, type A11yPrefs } from './preferences'

/**
 * 접근성 설정은 앱 전체에 하나 — 어디서 바꾸든(화면 설정, 시작 화면 '가가', 시작이 안내 창)
 * 같은 값을 보는 모든 화면이 함께 바뀐다.
 */
let current: A11yPrefs | null = null
const listeners = new Set<() => void>()

const read = () => (current ??= loadPrefs())

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** 바꾸는 즉시 화면에 적용되고 저장된다 */
export function updateA11yPrefs(patch: Partial<A11yPrefs>) {
  current = { ...read(), ...patch }
  applyPrefs(current)
  savePrefs(current)
  listeners.forEach((l) => l())
}

export function useA11yPrefs() {
  const prefs = useSyncExternalStore(subscribe, read)
  return { prefs, update: updateA11yPrefs }
}
