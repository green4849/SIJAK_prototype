import { createContext } from 'react'
import type { User } from '../api/authApi'

export type AuthStatus = 'loading' | 'authenticated' | 'anonymous'

export interface AuthContextValue {
  status: AuthStatus
  user: User | null
  /** verify·signup 성공 시 호출 */
  signIn: (accessToken: string, user: User) => void
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)
