/**
 * 백엔드 호출의 유일한 통로. feature의 api/ 모듈만 이 파일을 사용한다.
 * 에러 응답 형식은 backend/app/core/errors.py 와 1:1로 맞춘다.
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

// Stage 1에서 인증 토큰 주입기로 교체
let getAccessToken: () => string | null = () => null
export function setAccessTokenGetter(fn: () => string | null) {
  getAccessToken = fn
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = {}
  const token = getAccessToken()
  if (token) headers.Authorization = `Bearer ${token}`
  if (body !== undefined && !(body instanceof FormData)) headers['Content-Type'] = 'application/json'

  const res = await fetch(`${API_PREFIX}${path}`, {
    method,
    headers,
    body: body instanceof FormData ? body : body !== undefined ? JSON.stringify(body) : undefined,
  })

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

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, body),
  delete: <T>(path: string) => request<T>('DELETE', path),
}
