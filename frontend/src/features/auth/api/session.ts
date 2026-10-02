/**
 * access 토큰 보관(메모리 전용)과 refresh 단일화.
 *
 * refresh 토큰은 백엔드가 회전시키고, 이미 쓴 토큰이 다시 오면 탈취로 보고
 * 모든 세션을 끊는다. 그래서 동시에 여러 요청이 401을 받아도 refresh는
 * 반드시 한 번만 나가야 한다 → 진행 중인 Promise를 공유한다.
 */
import { configureAuth } from '@/shared/api/client'
import { authApi } from './authApi'

let accessToken: string | null = null
let inflight: Promise<string | null> | null = null
const listeners = new Set<(token: string | null) => void>()

export function getAccessToken() {
  return accessToken
}

export function setAccessToken(token: string | null) {
  accessToken = token
  listeners.forEach((fn) => fn(token))
}

/** 토큰이 사라지면(갱신 실패·로그아웃) 알림 → 화면을 로그인으로 돌린다 */
export function onAccessTokenChange(fn: (token: string | null) => void): () => void {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

export function refreshAccessToken(): Promise<string | null> {
  inflight ??= authApi
    .refresh()
    .then((r) => {
      setAccessToken(r.access_token)
      return r.access_token
    })
    .catch(() => {
      setAccessToken(null)
      return null
    })
    .finally(() => {
      inflight = null
    })
  return inflight
}

configureAuth({ getAccessToken, refreshAccessToken })
