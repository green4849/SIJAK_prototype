import { useCallback, useEffect, useRef, useState } from 'react'
import { errorMessage } from '@/shared/api/client'

/**
 * 데이터 불러오기 공용 훅 — 각 feature의 hooks/ 에서 감싸서 쓴다.
 * 늦게 도착한 이전 요청 결과가 최신 결과를 덮지 않도록 요청 번호로 막는다.
 */
export function useAsync<T>(load: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const seq = useRef(0)

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(load, deps)

  const reload = useCallback(async () => {
    const id = ++seq.current
    setLoading(true)
    setError(null)
    try {
      const result = await run()
      if (id === seq.current) setData(result)
    } catch (e) {
      if (id === seq.current) setError(errorMessage(e))
    } finally {
      if (id === seq.current) setLoading(false)
    }
  }, [run])

  useEffect(() => {
    void reload()
  }, [reload])

  useEffect(() => {
    // 오프라인 안내가 사라질 때 현재 화면의 목록도 다시 불러온다.
    const onReconnect = () => { void reload() }
    window.addEventListener('online', onReconnect)
    return () => window.removeEventListener('online', onReconnect)
  }, [reload])

  return { data, error, loading, reload, setData }
}
