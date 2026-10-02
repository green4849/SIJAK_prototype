import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { authApi, type User } from '../api/authApi'
import { onAccessTokenChange, refreshAccessToken, setAccessToken } from '../api/session'
import {
  AuthContext,
  type AuthContextValue,
  type AuthStatus,
  type PostAuthRedirect,
} from '../hooks/authContext'

/** 앱 시작 시 refresh 쿠키로 세션 복원 → 시니어는 매번 다시 인증할 필요 없음 (14일) */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading')
  const [user, setUser] = useState<User | null>(null)
  const [redirectAfterSignIn, setRedirect] = useState<PostAuthRedirect | null>(null)

  useEffect(() => {
    let alive = true
    ;(async () => {
      const token = await refreshAccessToken()
      if (!alive) return
      if (!token) return setStatus('anonymous')
      try {
        const me = await authApi.me()
        if (!alive) return
        setUser(me)
        setStatus('authenticated')
      } catch {
        if (alive) setStatus('anonymous')
      }
    })()
    return () => {
      alive = false
    }
  }, [])

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
    () => ({ status, user, redirectAfterSignIn, signIn, signOut, updateUser: setUser }),
    [status, user, redirectAfterSignIn, signIn, signOut],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
