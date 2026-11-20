/**
 * 다른 화면에서 시작이를 부르는 통로 (예: 도움말의 '시작이에게 물어보기').
 * 시작이 버튼을 숨겨 둔 사람도 여기로 열 수 있다.
 */
const listeners = new Set<() => void>()

export function openGuide() {
  listeners.forEach((l) => l())
}

export function onOpenRequest(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

const HINT_KEY = 'wipi.guide.hints'

function seenHints(): string[] {
  try {
    const list = JSON.parse(localStorage.getItem(HINT_KEY) ?? '[]') as unknown
    return Array.isArray(list) ? list.filter((v): v is string => typeof v === 'string') : []
  } catch {
    return ['*'] // 저장소를 못 쓰면 매번 말을 걸지 않는다
  }
}

/** 이 화면에서 시작이가 먼저 한마디 건넨 적이 있는지 — 화면마다 처음 한 번만 말을 건다 */
export const hasGreeted = (screen: string) => {
  const seen = seenHints()
  return seen.includes('*') || seen.includes(screen)
}

export function rememberGreeted(screen: string) {
  try {
    localStorage.setItem(HINT_KEY, JSON.stringify([...new Set([...seenHints(), screen])]))
  } catch {
    // 저장 못 해도 이번 화면에서는 다시 뜨지 않는다 (화면을 옮길 때까지)
  }
}
