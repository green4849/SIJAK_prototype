import { createContext } from 'react'
import type { User } from '../api/authApi'

/** offline = 시작할 때 서버에 닿지 못해 로그인 여부를 아직 모름 (로그아웃 아님) */
export type AuthStatus = 'loading' | 'authenticated' | 'anonymous' | 'offline'

/** 로그인 직후 이동할 곳. 실제 이동은 라우트 가드가 한 곳에서 처리한다. */
export interface PostAuthRedirect {
  to: string
  state?: unknown
}

export interface AuthContextValue {
  status: AuthStatus
  user: User | null
  redirectAfterSignIn: PostAuthRedirect | null
  /** verify·signup 성공 시 호출. next를 주면 로그인 후 그 화면으로 */
  signIn: (accessToken: string, user: User, next?: PostAuthRedirect) => void
  signOut: () => Promise<void>
  /** 프로필 수정 등으로 사용자 정보가 바뀌었을 때 */
  updateUser: (user: User) => void
  /** offline일 때 세션 복원 다시 시도 */
  retry: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)
