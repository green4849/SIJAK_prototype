import { afterEach, describe, expect, it, vi } from 'vitest'
import { api, ApiError, configureAuth, errorMessage, isServerWaking, RequestTimeoutError, setTransport } from './client'

const json = (status: number, body: unknown = {}) =>
  new Response(status === 204 ? null : JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
const authOf = (init: RequestInit) => new Headers(init.headers).get('Authorization')

afterEach(() => {
  configureAuth({ getAccessToken: () => null, refreshAccessToken: async () => null })
})

describe('api — 401이면 토큰을 한 번 새로 받아 다시 보낸다', () => {
  it('새 토큰으로 같은 요청을 한 번 더 보낸다', async () => {
    const refresh = vi.fn(async () => 'new')
    configureAuth({ getAccessToken: () => 'old', refreshAccessToken: refresh })
    const transport = vi.fn().mockResolvedValueOnce(json(401)).mockResolvedValueOnce(json(200, { ok: 1 }))
    setTransport(transport)

    await expect(api.get('/me')).resolves.toEqual({ ok: 1 })
    expect(refresh).toHaveBeenCalledTimes(1)
    expect(transport).toHaveBeenCalledTimes(2)
    expect(authOf(transport.mock.calls[0][1])).toBe('Bearer old')
    expect(authOf(transport.mock.calls[1][1])).toBe('Bearer new')
  })

  it('인증 API 자체(skipAuthRetry)는 다시 보내지 않는다', async () => {
    const refresh = vi.fn(async () => 'new')
    configureAuth({ getAccessToken: () => 'old', refreshAccessToken: refresh })
    setTransport(vi.fn().mockResolvedValue(json(401, { error: { code: 'invalid_token', message: '다시 로그인해 주세요.' } })))

    await expect(api.post('/auth/refresh', undefined, { skipAuthRetry: true })).rejects.toMatchObject({
      status: 401,
      code: 'invalid_token',
    })
    expect(refresh).not.toHaveBeenCalled()
  })

  it('갱신이 거절되면(null) 401 오류를 그대로 올린다', async () => {
    configureAuth({ getAccessToken: () => 'old', refreshAccessToken: async () => null })
    const transport = vi.fn().mockResolvedValue(json(401))
    setTransport(transport)
    await expect(api.get('/me')).rejects.toBeInstanceOf(ApiError)
    expect(transport).toHaveBeenCalledTimes(1)
  })

  it('갱신 중 연결이 끊기면 그 오류가 올라와 "연결이 원활하지 않아요"가 된다 (로그아웃 아님, H31)', async () => {
    configureAuth({
      getAccessToken: () => 'old',
      refreshAccessToken: () => Promise.reject(new TypeError('Failed to fetch')),
    })
    setTransport(vi.fn().mockResolvedValue(json(401)))
    const e = await api.get('/me').catch((err: unknown) => err)
    expect(e).toBeInstanceOf(TypeError)
    expect(errorMessage(e)).toBe('연결이 원활하지 않아요. 잠시 후 다시 시도해 주세요.')
  })
})

describe('api — 응답 해석', () => {
  it('204는 undefined', async () => {
    setTransport(vi.fn().mockResolvedValue(json(204)))
    await expect(api.delete('/x')).resolves.toBeUndefined()
  })

  it('백엔드 오류 형식의 code·message를 살린다', async () => {
    setTransport(vi.fn().mockResolvedValue(json(409, { error: { code: 'already_friends', message: '이미 친구예요.' } })))
    const e = await api.post('/friends/requests', {}).catch((err: unknown) => err)
    expect(e).toMatchObject({ status: 409, code: 'already_friends', message: '이미 친구예요.' })
    expect(errorMessage(e)).toBe('이미 친구예요.')
  })

  it('서버에 아직 없는 API(형식 없는 404)는 "아직 준비 중"', async () => {
    setTransport(vi.fn().mockResolvedValue(json(404, 'Not Found')))
    const e = await api.get('/draft').catch((err: unknown) => err)
    expect(errorMessage(e)).toBe('아직 준비 중인 기능이에요.')
  })

  it('JSON 본문은 Content-Type을 붙이고, FormData는 붙이지 않는다', async () => {
    const transport = vi.fn(async (_url: string, _init: RequestInit) => json(200)) // 응답 본문은 한 번만 읽히므로 매번 새로
    setTransport(transport)
    await api.post('/a', { x: 1 })
    await api.post('/b', new FormData())
    expect(new Headers(transport.mock.calls[0][1].headers).get('Content-Type')).toBe('application/json')
    expect(new Headers(transport.mock.calls[1][1].headers).get('Content-Type')).toBeNull()
    expect(transport.mock.calls[0][0]).toBe('/api/v1/a')
  })
})

describe('잠든 서버 — 시간 제한과 깨는 중 판별', () => {
  it('timeoutMs 안에 응답이 없으면 요청을 끊고 RequestTimeoutError', async () => {
    vi.useFakeTimers()
    try {
      // 서버가 답하지 않는 상황: abort 될 때까지 끝나지 않는 전송
      setTransport((_url, init) => new Promise((_resolve, reject) => {
        init.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')))
      }))
      const p = api.post('/auth/refresh', undefined, { skipAuthRetry: true, timeoutMs: 12_000 })
      const caught = p.catch((e: unknown) => e)
      await vi.advanceTimersByTimeAsync(12_000)
      const e = await caught
      expect(e).toBeInstanceOf(RequestTimeoutError)
      expect(isServerWaking(e)).toBe(true)
    } finally {
      vi.useRealTimers()
    }
  })

  it('시간 제한이 없으면 신호를 붙이지 않는다 (지금까지와 같게)', async () => {
    const transport = vi.fn().mockResolvedValue(json(200, { ok: 1 }))
    setTransport(transport)
    await api.get('/x')
    expect(transport.mock.calls[0][1].signal).toBeUndefined()
  })

  it('앞단 502·503·504 는 깨는 중, 연결 끊김(TypeError)·401 은 아니다', () => {
    expect(isServerWaking(new ApiError(502, 'unknown_error', ''))).toBe(true)
    expect(isServerWaking(new ApiError(503, 'unknown_error', ''))).toBe(true)
    expect(isServerWaking(new ApiError(504, 'unknown_error', ''))).toBe(true)
    expect(isServerWaking(new ApiError(401, 'invalid_token', ''))).toBe(false)
    expect(isServerWaking(new TypeError('Failed to fetch'))).toBe(false)
  })
})
