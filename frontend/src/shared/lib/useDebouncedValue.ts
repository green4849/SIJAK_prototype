import { useEffect, useState } from 'react'

/** 입력을 멈춘 뒤 검색한다. 타이핑 중에는 기존 결과를 유지한다. */
export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs)
    return () => window.clearTimeout(timer)
  }, [value, delayMs])
  return debounced
}
