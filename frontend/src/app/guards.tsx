import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/features/auth'

function Loading() {
  return <p role="status">잠시만 기다려 주세요…</p>
}

/** 로그인한 사람만 */
export function RequireAuth() {
  const { status } = useAuth()
  if (status === 'loading') return <Loading />
  return status === 'authenticated' ? <Outlet /> : <Navigate to="/welcome" replace />
}

/**
 * 로그인 안 한 사람만 (인증·가입 화면).
 * 로그인되는 순간 여기서 다음 화면으로 보낸다 — 로그인 후 이동은 이 한 곳에서만.
 */
export function RequireGuest() {
  const { status, redirectAfterSignIn } = useAuth()
  if (status === 'loading') return <Loading />
  if (status === 'anonymous') return <Outlet />
  return (
    <Navigate
      to={redirectAfterSignIn?.to ?? '/'}
      state={redirectAfterSignIn?.state}
      replace
    />
  )
}
