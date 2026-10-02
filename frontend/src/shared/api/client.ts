/**
 * 백엔드 호출의 유일한 통로. feature의 api/ 모듈만 이 파일을 사용한다.
 * 에러 응답 형식은 backend/app/core/errors.py 와 1:1로 맞춘다.
 *
 * 인증은 auth feature가 configureAuth()로 주입한다 (shared는 features를 모른다).
 *  - getAccessToken : 매 요청에 Bearer 토큰 첨부
 *  - refreshAccessToken : 401이면 한 번 갱신 후 재시도
 */

const API_PREFIX = '/api/v1'

export class ApiError extends Error {
  readonly status: number
  readonly code: string

  constructor(status: number, code: string, message: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

interface ErrorBody {
  error?: { code?: string; message?: string }
}

interface AuthHooks {
  getAccessToken: () => string | null
  refreshAccessToken: () => Promise<string | null>
}

let auth: AuthHooks = {
  getAccessToken: () => null,
  refreshAccessToken: async () => null,
}

export function configureAuth(hooks: AuthHooks) {
  auth = hooks
}

interface RequestOptions {
  /** true면 401이어도 토큰 갱신·재시도를 하지 않는다 (인증 API 자체용) */
  skipAuthRetry?: boolean
}

async function send(method: string, path: string, body: unknown, token: string | null) {
  const headers: Record<string, string> = {}
  if (token) headers.Authorization = `Bearer ${token}`
  const isForm = body instanceof FormData
  if (body !== undefined && !isForm) headers['Content-Type'] = 'application/json'

  // 절대 경로(/api/v1/...)로 받은 URL도 그대로 쓸 수 있게
  const url = path.startsWith(API_PREFIX) ? path : `${API_PREFIX}${path}`
  return fetch(url, {
    method,
    headers,
    credentials: 'same-origin', // refresh 쿠키 전송
    body: isForm ? body : body !== undefined ? JSON.stringify(body) : undefined,
  })
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  opts: RequestOptions = {},
): Promise<T> {
  let res = await send(method, path, body, auth.getAccessToken())

  if (res.status === 401 && !opts.skipAuthRetry) {
    const fresh = await auth.refreshAccessToken()
    if (fresh) res = await send(method, path, body, fresh)
  }

  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as ErrorBody
    throw new ApiError(
      res.status,
      data.error?.code ?? 'unknown_error',
      data.error?.message ?? '요청을 처리하지 못했어요. 잠시 후 다시 시도해 주세요.',
    )
  }
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T)
}

/** 파일 받기 (음성 등) — <audio src>는 인증 헤더를 못 보내므로 Blob으로 받아 로컬 URL을 만든다 */
async function blob(path: string): Promise<Blob> {
  let res = await send('GET', path, undefined, auth.getAccessToken())
  if (res.status === 401) {
    const fresh = await auth.refreshAccessToken()
    if (fresh) res = await send('GET', path, undefined, fresh)
  }
  if (!res.ok) throw new ApiError(res.status, 'download_failed', '파일을 불러오지 못했어요.')
  return res.blob()
}

export const api = {
  blob,
  get: <T>(path: string, opts?: RequestOptions) => request<T>('GET', path, undefined, opts),
  post: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    request<T>('POST', path, body, opts),
  put: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    request<T>('PUT', path, body, opts),
  patch: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    request<T>('PATCH', path, body, opts),
  delete: <T>(path: string, opts?: RequestOptions) => request<T>('DELETE', path, undefined, opts),
}

/** 사용자에게 보여줄 문구로 변환 */
export function errorMessage(e: unknown): string {
  if (e instanceof ApiError) return e.message
  return '연결이 원활하지 않아요. 잠시 후 다시 시도해 주세요.'
}
