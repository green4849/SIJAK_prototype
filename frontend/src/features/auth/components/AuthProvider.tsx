import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { isServerWaking } from '@/shared/api/client'
import { unsubscribeDevice } from '@/shared/lib/push'
import { authApi, type User } from '../api/authApi'
import {
  isSessionRejected,
  onAccessTokenChange,
  refreshAccessToken,
  setAccessToken,
} from '../api/session'
import {
  AuthContext,
  type AuthContextValue,
  type AuthStatus,
  type PostAuthRedirect,
} from '../hooks/authContext'

/**
 * refresh 쿠키로 세션 복원. 연결이 안 되면 로그아웃으로 보내지 않고 'offline'
 * — 다시 연결되면 저절로 재시도한다 (H31).
 * waking: 서버가 늦거나(잠들었다 깨는 중) 앞단이 502·503·504 — 기다렸다 다시 묻는다
 */
async function restoreSession(): Promise<{ status: AuthStatus; user: User | null; waking?: boolean }> {
  try {
    const token = await refreshAccessToken()
    if (!token) return { status: 'anonymous', user: null }
    return { status: 'authenticated', user: await authApi.me() }
  } catch (e) {
    if (isSessionRejected(e)) return { status: 'anonymous', user: null }
    return { status: 'offline', user: null, waking: isServerWaking(e) }
  }
}

/** 무료 서버는 15분 쉬면 잠들고 깨는 데 10초~1분 — 그동안 '잠시만 기다려 주세요'에서 다시 묻는다 */
const WAKE_RETRY_MS = 3_000
const WAKE_GIVE_UP_MS = 90_000
/** 연결 안내 화면에 있는 동안에도 이만큼마다 다시 묻는다 ('online' 이벤트가 없는 경우 — 서버만 멈췄던 때) */
const OFFLINE_RETRY_MS = 30_000

async function restoreWaitingForServer(alive: () => boolean) {
  const start = Date.now()
  for (;;) {
    const r = await restoreSession()
    if (!r.waking || !alive() || Date.now() - start >= WAKE_GIVE_UP_MS) return r
    await new Promise((resolve) => setTimeout(resolve, WAKE_RETRY_MS))
  }
}

/** 앱 시작 시 refresh 쿠키로 세션 복원 → 시니어는 매번 다시 인증할 필요 없음 (14일) */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading')
  const [user, setUser] = useState<User | null>(null)
  const [redirectAfterSignIn, setRedirect] = useState<PostAuthRedirect | null>(null)

  useEffect(() => {
    let alive = true
    ;(async () => {
      const r = await restoreWaitingForServer(() => alive)
      if (!alive) return
      setUser(r.user)
      setStatus(r.status)
    })()
    return () => {
      alive = false
    }
  }, [])

  const retry = useCallback(() => {
    setStatus('loading')
    void restoreWaitingForServer(() => true).then((r) => {
      setUser(r.user)
      setStatus(r.status)
    })
  }, [])

  useEffect(() => {
    if (status !== 'offline') return
    window.addEventListener('online', retry)
    const timer = window.setInterval(retry, OFFLINE_RETRY_MS)
    return () => {
      window.removeEventListener('online', retry)
      window.clearInterval(timer)
    }
  }, [status, retry])

  // 다른 요청에서 갱신이 실패해 토큰이 사라지면 로그아웃 상태로
  useEffect(
    () =>
      onAccessTokenChange((token) => {
        if (token === null) {
          setUser(null)
          setStatus('anonymous')
        }
      }),
    [],
  )

  const signIn = useCallback((accessToken: string, u: User, next?: PostAuthRedirect) => {
    setAccessToken(accessToken)
    setRedirect(next ?? null)
    setUser(u)
    setStatus('authenticated')
  }, [])

  const signOut = useCallback(async () => {
    // 이 기기 휴대폰 알림부터 끈다 — 같은 기기를 다음 사람이 써도 앞 사람 알림이 오지 않게 (C4)
    await unsubscribeDevice()
    await authApi.logout().catch(() => undefined)
    setAccessToken(null)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      redirectAfterSignIn,
      signIn,
      signOut,
      updateUser: setUser,
      retry,
    }),
    [status, user, redirectAfterSignIn, signIn, signOut, retry],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
