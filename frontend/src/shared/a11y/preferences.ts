/**
 * 접근성 설정 (글자 크기 4단계 · 고대비) — 기기별로 저장.
 * <html data-font-scale data-contrast> 속성만 바꾸고, 실제 값은 tokens.css가 정한다.
 */

export type FontScale = 1 | 2 | 3 | 4
export type Contrast = 'normal' | 'high'

export interface A11yPrefs {
  fontScale: FontScale
  contrast: Contrast
}

const KEY = 'wipi.a11y'

function systemDefaults(): A11yPrefs {
  const high = typeof matchMedia === 'function' && matchMedia('(prefers-contrast: more)').matches
  return { fontScale: 1, contrast: high ? 'high' : 'normal' }
}

export function loadPrefs(): A11yPrefs {
  const defaults = systemDefaults()
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return defaults
    const p = JSON.parse(raw) as Partial<A11yPrefs>
    return {
      fontScale: [1, 2, 3, 4].includes(p.fontScale as number) ? (p.fontScale as FontScale) : 1,
      contrast: p.contrast === 'high' ? 'high' : defaults.contrast,
    }
  } catch {
    return defaults // 사생활 보호 모드 등에서 저장소 접근 불가
  }
}

export function savePrefs(p: A11yPrefs) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p))
  } catch {
    // 저장 못 해도 이번 사용에는 적용됨
  }
}

export function applyPrefs(p: A11yPrefs) {
  const root = document.documentElement
  if (p.fontScale === 1) delete root.dataset.fontScale
  else root.dataset.fontScale = String(p.fontScale)
  if (p.contrast === 'high') root.dataset.contrast = 'high'
  else delete root.dataset.contrast
}
