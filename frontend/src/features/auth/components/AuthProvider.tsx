import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
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
 */
async function restoreSession(): Promise<{ status: AuthStatus; user: User | null }> {
  try {
    const token = await refreshAccessToken()
    if (!token) return { status: 'anonymous', user: null }
    return { status: 'authenticated', user: await authApi.me() }
  } catch (e) {
    return { status: isSessionRejected(e) ? 'anonymous' : 'offline', user: null }
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
      const r = await restoreSession()
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
    void restoreSession().then((r) => {
      setUser(r.user)
      setStatus(r.status)
    })
  }, [])

  useEffect(() => {
    if (status !== 'offline') return
    window.addEventListener('online', retry)
    return () => window.removeEventListener('online', retry)
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
