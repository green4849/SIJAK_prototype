/**
 * access 토큰 보관(메모리 전용)과 refresh 단일화.
 *
 * refresh 토큰은 백엔드가 회전시키고, 이미 쓴 토큰이 한참 뒤 다시 오면 탈취로 보고
 * 모든 세션을 끊는다. 그래서 동시에 여러 요청이 401을 받아도 refresh는
 * 반드시 한 번만 나가야 한다:
 *  - 한 탭 안: 진행 중인 Promise를 공유
 *  - 탭·홈 화면 앱 사이: Web Locks로 차례대로 (앞 탭이 쿠키를 바꾼 뒤 다음 탭이 새 쿠키로 갱신)
 *  - 그래도 겹치면 백엔드가 token_rotated(유예 중)로 답함 → 한 번 더 시도
 *
 * 로그아웃(토큰 지움)은 서버가 "이 토큰은 안 된다"(401·403)고 답할 때만.
 * 지하·엘리베이터에서 잠깐 끊긴 건(네트워크 오류·5xx·429) 로그인을 그대로 두고 오류만 올린다 (H31).
 */
import { ApiError, configureAuth } from '@/shared/api/client'
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

/** 토큰이 사라지면(갱신 거절·로그아웃) 알림 → 화면을 로그인으로 돌린다 */
export function onAccessTokenChange(fn: (token: string | null) => void): () => void {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

/** 서버가 refresh 토큰 자체를 거절했는지 — 이때만 로그아웃 */
export function isSessionRejected(e: unknown): boolean {
  return e instanceof ApiError && (e.status === 401 || e.status === 403)
}

const ROTATED_RETRY_MS = 300

/** 다른 탭과 겹치지 않게 갱신 (Web Locks가 없는 옛 브라우저는 그냥 보냄) */
function refreshOnce() {
  const locks = typeof navigator !== 'undefined' ? navigator.locks : undefined
  return locks ? locks.request('sijak-auth-refresh', () => authApi.refresh()) : authApi.refresh()
}

async function refreshWithRetry() {
  try {
    return await refreshOnce()
  } catch (e) {
    // 방금 다른 탭이 회전시킴 → 쿠키가 새것으로 바뀌었으니 한 번 더
    if (e instanceof ApiError && e.code === 'token_rotated') {
      await new Promise((r) => setTimeout(r, ROTATED_RETRY_MS))
      return refreshOnce()
    }
    throw e
  }
}

/**
 * 새 access 토큰. null = 서버가 거절해 로그아웃됨.
 * 연결 문제면 예외를 그대로 던진다 → 부른 화면은 "연결이 원활하지 않아요"를 보이고 로그인은 유지.
 */
export function refreshAccessToken(): Promise<string | null> {
  inflight ??= refreshWithRetry()
    .then((r) => {
      setAccessToken(r.access_token)
      return r.access_token
    })
    .catch((e: unknown) => {
      if (!isSessionRejected(e)) throw e
      setAccessToken(null)
      return null
    })
    .finally(() => {
      inflight = null
    })
  return inflight
}

configureAuth({ getAccessToken, refreshAccessToken })
