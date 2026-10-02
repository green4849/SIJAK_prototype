/** auth 백엔드 계약 — backend/app/domains/auth/schemas.py 와 1:1 */
import { api } from '@/shared/api/client'

export type Gender = 'M' | 'F'

export interface User {
  id: string
  name: string
  birth_date: string
  age: number
  gender: Gender
  region_code: string
  region_name: string
  interests: string[]
  intro: string
}

export interface ProfileUpdate {
  intro?: string
  region_code?: string
  interests?: string[]
}

export interface Option {
  code: string
  label: string
}

export interface SignupOptions {
  regions: Option[]
  interests: Option[]
  max_interests: number
}

export interface PassStartInput {
  name: string
  birth_date: string // YYYY-MM-DD
  phone: string
  gender: Gender
}

export interface PassStartResult {
  session_id: string
  dev_code: string | null
}

export type AuthResult =
  | { status: 'logged_in'; access_token: string; user: User }
  | { status: 'signup_required'; signup_token: string; name: string }

const noRetry = { skipAuthRetry: true }

export const authApi = {
  options: () => api.get<SignupOptions>('/auth/options', noRetry),

  startPass: (input: PassStartInput) =>
    api.post<PassStartResult>('/auth/pass/start', input, noRetry),

  verifyPass: (session_id: string, code: string) =>
    api.post<AuthResult>('/auth/pass/verify', { session_id, code }, noRetry),

  signup: (signup_token: string, region_code: string, interests: string[]) =>
    api.post<AuthResult>('/auth/signup', { signup_token, region_code, interests }, noRetry),

  refresh: () => api.post<{ access_token: string }>('/auth/refresh', undefined, noRetry),

  logout: () => api.post<void>('/auth/logout', undefined, noRetry),

  me: () => api.get<User>('/me'),

  updateMe: (patch: ProfileUpdate) => api.patch<User>('/me', patch),
}
