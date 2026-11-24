import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/features/auth'
import { Button } from '@/shared/ui/Button'

function Loading() {
  return <p role="status">잠시만 기다려 주세요…</p>
}

/**
 * 앱을 열 때 인터넷이 안 돼 로그인 확인을 못 한 상태 (H31).
 * 로그아웃이 아니다 — 휴대폰 인증부터 다시 하게 하지 않고, 연결되면 저절로 이어진다.
 */
function Offline() {
  const { retry } = useAuth()
  return (
    <section>
      <h1>인터넷 연결이 안 돼요</h1>
      <p>와이파이나 데이터가 켜져 있는지 봐 주세요. 연결되면 저절로 이어져요.</p>
      <Button block onClick={retry}>
        다시 시도
      </Button>
    </section>
  )
}

/** 로그인한 사람만 */
export function RequireAuth() {
  const { status } = useAuth()
  if (status === 'loading') return <Loading />
  if (status === 'offline') return <Offline />
  return status === 'authenticated' ? <Outlet /> : <Navigate to="/welcome" replace />
}

/**
 * 로그인 안 한 사람만 (인증·가입 화면).
 * 로그인되는 순간 여기서 다음 화면으로 보낸다 — 로그인 후 이동은 이 한 곳에서만.
 */
export function RequireGuest() {
  const { status, redirectAfterSignIn } = useAuth()
  if (status === 'loading') return <Loading />
  if (status === 'offline') return <Offline />
  if (status === 'anonymous') return <Outlet />
  return (
    <Navigate
      to={redirectAfterSignIn?.to ?? '/'}
      state={redirectAfterSignIn?.state}
      replace
    />
  )
}
