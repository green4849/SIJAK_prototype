import { Component, Suspense, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { Button } from '@/shared/ui/Button'
import styles from './AppLayout.module.css'

/** 화면 조각을 받는 동안 — 금방 끝나면 깜빡이지 않게 잠깐 뒤에야 보인다 (AppLayout.module.css .pending) */
function Pending() {
  return (
    <p role="status" className={styles.pending}>
      잠시만 기다려 주세요…
    </p>
  )
}

interface State {
  error: unknown
}

const CHUNK_FAILED = /dynamically imported module|Importing a module script failed|Loading chunk|error loading dynamically/i

/**
 * 화면 조각을 못 받았을 때 (연결 끊김, 저장본이 없는 옛 배포 조각 등) — 흰 화면 대신 안내와 다시 시도.
 * 다른 오류는 그대로 위로 올린다.
 */
class ChunkErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: unknown): State {
    return { error }
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children
    if (!CHUNK_FAILED.test(error instanceof Error ? error.message : String(error))) throw error
    return (
      <section>
        <h1>화면을 불러오지 못했어요</h1>
        <p>인터넷 연결을 확인한 뒤 다시 시도해 주세요.</p>
        <Button block onClick={() => window.location.reload()}>
          다시 시도
        </Button>
      </section>
    )
  }
}

/** 화면별로 나눠 받은 조각을 기다리는 자리 (H33). 화면이 바뀌면 오류 상태도 새로 시작한다 */
export function RouteBoundary({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()
  return (
    <ChunkErrorBoundary key={pathname}>
      <Suspense fallback={<Pending />}>{children}</Suspense>
    </ChunkErrorBoundary>
  )
}
