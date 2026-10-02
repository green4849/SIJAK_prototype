import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/features/auth'

function Loading() {
  return <p role="status">잠시만 기다려 주세요…</p>
}

/** 로그인한 사람만 */
export function RequireAuth() {
  const { status } = useAuth()
  if (status === 'loading') return <Loading />
  return status === 'authenticated' ? <Outlet /> : <Navigate to="/start" replace />
}

/** 로그인 안 한 사람만 (인증·가입 화면) */
export function RequireGuest() {
  const { status } = useAuth()
  if (status === 'loading') return <Loading />
  return status === 'anonymous' ? <Outlet /> : <Navigate to="/" replace />
}
