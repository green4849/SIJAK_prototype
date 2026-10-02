import { useState } from 'react'
import { applyPrefs, loadPrefs, savePrefs, type A11yPrefs } from './preferences'

/** 바꾸는 즉시 화면에 적용되고 저장된다 */
export function useA11yPrefs() {
  const [prefs, setPrefs] = useState<A11yPrefs>(loadPrefs)

  function update(patch: Partial<A11yPrefs>) {
    const next = { ...prefs, ...patch }
    setPrefs(next)
    applyPrefs(next)
    savePrefs(next)
  }

  return { prefs, update }
}
