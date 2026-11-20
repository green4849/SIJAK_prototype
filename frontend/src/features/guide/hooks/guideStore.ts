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

const SEEN_KEY = 'wipi.guide.seen'

/** 한 번이라도 열어 봤는지 — 처음 보는 사람에게만 말풍선으로 알려 준다 */
export function hasMetGuide(): boolean {
  try {
    return localStorage.getItem(SEEN_KEY) === '1'
  } catch {
    return true // 저장소를 못 쓰면 매번 띄우지 않는다
  }
}

export function rememberGuide() {
  try {
    localStorage.setItem(SEEN_KEY, '1')
  } catch {
    // 저장 못 해도 이번에는 닫힌다
  }
}
