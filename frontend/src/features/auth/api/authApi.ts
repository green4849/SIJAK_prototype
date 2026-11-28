/** auth API — 타입은 백엔드 OpenAPI에서 생성 (shared/api/types.ts) */
import { api } from '@/shared/api/client'
import type { Schema } from '@/shared/api/types'

export type User = Schema<'UserOut'>
export type Gender = User['gender']
export type ProfileUpdate = Schema<'ProfileUpdate'>
export type Option = Schema<'Option'>
export type SignupOptions = Schema<'SignupOptions'>
export type ConsentDoc = Schema<'ConsentDocOut'>
export type ConsentStatus = Schema<'ConsentStatusOut'>
export type ConsentChoice = Schema<'ConsentChoiceIn'>
/** birth_date: YYYY-MM-DD */
export type PassStartInput = Schema<'PassStartRequest'>
export type PassStartResult = Schema<'PassStartResponse'>
export type LoggedInResult = Schema<'LoggedInResult'>
/** status 로 구분: 기존 회원이면 바로 로그인, 신규면 가입 단계로 */
export type AuthResult = LoggedInResult | Schema<'SignupRequiredResult'>
export type AuthMethod = Schema<'AuthMethod'>
export interface KakaoSignupProfile { name: string; birth_date: string; gender: 'M' | 'F' }

const noRetry = { skipAuthRetry: true }
/** 앱을 열 때 처음 묻는 요청 — 잠든 서버를 무한정 기다리지 않게 (AuthProvider 가 다시 시도) */
const startup = { skipAuthRetry: true, timeoutMs: 12_000 }

export const authApi = {
  method: () => api.get<AuthMethod>('/auth/method', startup),
  options: () => api.get<SignupOptions>('/auth/options', noRetry),

  startPass: (input: PassStartInput) =>
    api.post<PassStartResult>('/auth/pass/start', input, noRetry),

  /** proof: Mock 은 화면의 인증번호 { code }, Firebase 는 문자 확인 뒤 { id_token } */
  verifyPass: (session_id: string, proof: { code: string } | { id_token: string }) =>
    api.post<AuthResult>('/auth/pass/verify', { session_id, ...proof } satisfies Schema<'PassVerifyRequest'>, noRetry),

  completeKakao: (code: string, state: string) =>
    api.post<AuthResult>('/auth/kakao/complete', { code, state } satisfies Schema<'KakaoCompleteRequest'>, noRetry),

  signup: (signup_token: string, region_code: string, interests: string[], consents: ConsentChoice[], profile?: KakaoSignupProfile) =>
    api.post<LoggedInResult>(
      '/auth/signup',
      { signup_token, region_code, interests, consents, ...profile } satisfies Schema<'SignupRequest'>,
      noRetry,
    ),

  refresh: () => api.post<Schema<'TokenResponse'>>('/auth/refresh', undefined, startup),

  logout: () => api.post<void>('/auth/logout', undefined, noRetry),

  me: () => api.get<User>('/me'),

  updateMe: (patch: ProfileUpdate) => api.patch<User>('/me', patch),

  /** GPS 좌표 → 서버가 ≈1km 단위로 뭉개서 저장 */
  updateLocation: (lat: number, lng: number) =>
    api.put<User>('/me/location', { lat, lng } satisfies Schema<'LocationUpdate'>),

  /** 약관·개인정보 동의 상태 (B6) */
  consents: () => api.get<ConsentStatus[]>('/me/consents'),

  /** 동의하기 — 약관이 바뀌어 다시 받을 때 (철회는 받지 않는다) */
  agreeConsents: (items: ConsentChoice[]) =>
    api.post<User>('/me/consents', { items } satisfies Schema<'ConsentsUpdate'>),

  /** 회원 탈퇴 (B3) — 백엔드 없음, 임시 계약 shared/api/draft.ts */
  withdraw: (reason: string | null) =>
    api.post<Schema<'WithdrawOut'>>('/me/withdraw', { reason } satisfies Schema<'WithdrawIn'>),
}
