import { useEffect, useRef } from 'react'

/**
 * 화면이 보일 때만 주기적으로 실행 (다른 앱으로 가면 멈춤 → 배터리·데이터 절약).
 * 실시간 전환 시 이 훅만 WebSocket 구독으로 교체 (docs/deferred.md §2).
 */
export function usePolling(fn: () => void | Promise<void>, intervalMs: number, enabled = true) {
  const saved = useRef(fn)
  useEffect(() => {
    saved.current = fn
  })

  useEffect(() => {
    if (!enabled) return
    let running = false
    const tick = async () => {
      if (running || document.hidden) return
      running = true
      try {
        await saved.current()
      } finally {
        running = false
      }
    }
    const id = window.setInterval(tick, intervalMs)
    const onVisible = () => !document.hidden && void tick()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [intervalMs, enabled])
}
