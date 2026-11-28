import { useEffect, useState } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/features/auth'
import { Button } from '@/shared/ui/Button'

/** 이만큼 넘게 걸리면 서버가 깨는 중이라고 알려 준다 — 멈춘 줄 알고 떠나지 않게 */
const SLOW_HINT_MS = 4_000

function Loading() {
  const [slow, setSlow] = useState(false)
  useEffect(() => {
    const timer = window.setTimeout(() => setSlow(true), SLOW_HINT_MS)
    return () => window.clearTimeout(timer)
  }, [])
  return (
    <div role="status">
      <p>잠시만 기다려 주세요…</p>
      {slow && <p>서버를 깨우는 중이에요. 길면 1분쯤 걸려요. 창을 닫지 말고 기다려 주세요.</p>}
    </div>
  )
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
      <p>인터넷이 켜져 있는데도 이 화면이면 서버가 잠시 멈춘 거예요. 30초마다 저절로 다시 시도해요.</p>
      <Button block onClick={retry}>
        다시 시도
      </Button>
    </section>
  )
}

/**
 * 로그인한 사람만.
 * 필수 약관에 아직 동의하지 않았으면(약관이 바뀌었거나 동의 단계 전에 가입) 다시 동의 화면부터 (B6)
 */
export function RequireAuth() {
  const { status, user } = useAuth()
  const { pathname } = useLocation()
  if (status === 'loading') return <Loading />
  if (status === 'offline') return <Offline />
  if (status !== 'authenticated') return <Navigate to="/welcome" replace />
  if (user?.consent_needed && pathname !== '/consent') return <Navigate to="/consent" replace />
  return <Outlet />
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
