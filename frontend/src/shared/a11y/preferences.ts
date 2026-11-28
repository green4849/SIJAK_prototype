/**
 * 접근성 설정 (글자 크기 4단계 · 고대비 · 진동 · 시작이 버튼) — 기기별로 저장.
 * <html data-font-scale data-contrast> 속성만 바꾸고, 실제 값은 tokens.css가 정한다.
 */

export type FontScale = 1 | 2 | 3 | 4
export type Contrast = 'normal' | 'high'

export interface A11yPrefs {
  fontScale: FontScale
  contrast: Contrast
  /** 동작 성공 시 짧은 진동 (A4) */
  vibration: boolean
  /** 화면 구석의 '시작이에게 물어보기' 버튼을 보일지 (C14) — 꺼도 도움말에서 부를 수 있다 */
  guide: boolean
  /** 상단의 '화면 읽어 주기' 버튼과 읽기 속도 (A6) */
  readAloud: boolean
  speechRate: 0.8 | 1 | 1.2
}

const KEY = 'wipi.a11y'

function systemDefaults(): A11yPrefs {
  const high = typeof matchMedia === 'function' && matchMedia('(prefers-contrast: more)').matches
  return { fontScale: 1, contrast: high ? 'high' : 'normal', vibration: true, guide: true, readAloud: true, speechRate: 1 }
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
      vibration: p.vibration !== false,
      guide: p.guide !== false,
      readAloud: p.readAloud !== false,
      speechRate: [0.8, 1, 1.2].includes(p.speechRate as number) ? p.speechRate as A11yPrefs['speechRate'] : 1,
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
