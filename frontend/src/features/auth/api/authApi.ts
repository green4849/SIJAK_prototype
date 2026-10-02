/** auth API — 타입은 백엔드 OpenAPI에서 생성 (shared/api/types.ts) */
import { api } from '@/shared/api/client'
import type { Schema } from '@/shared/api/types'

export type User = Schema<'UserOut'>
export type Gender = User['gender']
export type ProfileUpdate = Schema<'ProfileUpdate'>
export type Option = Schema<'Option'>
export type SignupOptions = Schema<'SignupOptions'>
/** birth_date: YYYY-MM-DD */
export type PassStartInput = Schema<'PassStartRequest'>
export type PassStartResult = Schema<'PassStartResponse'>
export type LoggedInResult = Schema<'LoggedInResult'>
/** status 로 구분: 기존 회원이면 바로 로그인, 신규면 가입 단계로 */
export type AuthResult = LoggedInResult | Schema<'SignupRequiredResult'>

const noRetry = { skipAuthRetry: true }

export const authApi = {
  options: () => api.get<SignupOptions>('/auth/options', noRetry),

  startPass: (input: PassStartInput) =>
    api.post<PassStartResult>('/auth/pass/start', input, noRetry),

  verifyPass: (session_id: string, code: string) =>
    api.post<AuthResult>('/auth/pass/verify', { session_id, code } satisfies Schema<'PassVerifyRequest'>, noRetry),

  signup: (signup_token: string, region_code: string, interests: string[]) =>
    api.post<LoggedInResult>(
      '/auth/signup',
      { signup_token, region_code, interests } satisfies Schema<'SignupRequest'>,
      noRetry,
    ),

  refresh: () => api.post<Schema<'TokenResponse'>>('/auth/refresh', undefined, noRetry),

  logout: () => api.post<void>('/auth/logout', undefined, noRetry),

  me: () => api.get<User>('/me'),

  updateMe: (patch: ProfileUpdate) => api.patch<User>('/me', patch),

  /** GPS 좌표 → 서버가 ≈1km 단위로 뭉개서 저장 */
  updateLocation: (lat: number, lng: number) =>
    api.put<User>('/me/location', { lat, lng } satisfies Schema<'LocationUpdate'>),
}
