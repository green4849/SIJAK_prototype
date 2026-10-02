import { useSyncExternalStore } from 'react'

/**
 * 여러 화면이 같은 값을 써도 요청은 하나만 도는 폴링 저장소.
 *  - 첫 구독자가 생기면 불러오기 + 주기 갱신 시작, 마지막 구독자가 떠나면 멈춤
 *  - 화면이 안 보이면(다른 앱) 건너뜀
 *  - refresh(): 값이 바뀌었을 법한 순간(대화를 읽음, 신청 수락)에 즉시 갱신
 */
export function createPolledStore<T>(load: () => Promise<T>, intervalMs: number) {
  let value: T | null = null
  let timer: number | undefined
  let inflight: Promise<void> | null = null
  const subscribers = new Set<() => void>()

  function emit() {
    subscribers.forEach((fn) => fn())
  }

  function refresh(): Promise<void> {
    inflight ??= load()
      .then((v) => {
        value = v
        emit()
      })
      .catch(() => {
        // 실패해도 이전 값 유지 — 다음 주기에 다시
      })
      .finally(() => {
        inflight = null
      })
    return inflight
  }

  function subscribe(fn: () => void) {
    subscribers.add(fn)
    if (subscribers.size === 1) {
      value = null // 다른 계정으로 다시 로그인했을 수 있으니 새로
      void refresh()
      timer = window.setInterval(() => !document.hidden && void refresh(), intervalMs)
    }
    return () => {
      subscribers.delete(fn)
      if (subscribers.size === 0) window.clearInterval(timer)
    }
  }

  function useValue(): T | null {
    return useSyncExternalStore(subscribe, () => value)
  }

  return { useValue, refresh }
}
