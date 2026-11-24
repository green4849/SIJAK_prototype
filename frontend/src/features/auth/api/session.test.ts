import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '@/shared/api/client'

const refresh = vi.fn()
vi.mock('./authApi', () => ({ authApi: { refresh: () => refresh() } }))

const { getAccessToken, onAccessTokenChange, refreshAccessToken, setAccessToken } = await import('./session')

const token = (t: string) => ({ access_token: t, token_type: 'bearer' })

beforeEach(() => {
  refresh.mockReset()
  vi.unstubAllGlobals()
  setAccessToken('keep')
})

describe('refreshAccessToken — 토큰 갱신', () => {
  it('여러 요청이 동시에 401을 받아도 갱신은 한 번만 나간다', async () => {
    let done!: (v: unknown) => void
    refresh.mockReturnValue(new Promise((r) => (done = r)))
    const all = Promise.all([refreshAccessToken(), refreshAccessToken(), refreshAccessToken()])
    done(token('new'))
    expect(await all).toEqual(['new', 'new', 'new'])
    expect(refresh).toHaveBeenCalledTimes(1)
    expect(getAccessToken()).toBe('new')
  })

  it('서버가 거절하면(401) 토큰을 지우고 null — 화면은 로그인으로', async () => {
    const seen: (string | null)[] = []
    const off = onAccessTokenChange((t) => seen.push(t))
    refresh.mockRejectedValue(new ApiError(401, 'invalid_token', '다시 로그인해 주세요.'))
    await expect(refreshAccessToken()).resolves.toBeNull()
    expect(getAccessToken()).toBeNull()
    expect(seen).toEqual([null])
    off()
  })

  it('연결이 끊기면 예외를 올리고 로그인은 그대로 (H31)', async () => {
    refresh.mockRejectedValue(new TypeError('Failed to fetch'))
    await expect(refreshAccessToken()).rejects.toBeInstanceOf(TypeError)
    expect(getAccessToken()).toBe('keep')
  })

  it('서버 오류(5xx)·요청 제한(429)도 로그아웃이 아니다', async () => {
    refresh.mockRejectedValueOnce(new ApiError(503, 'unknown_error', '잠시 후'))
    await expect(refreshAccessToken()).rejects.toMatchObject({ status: 503 })
    refresh.mockRejectedValueOnce(new ApiError(429, 'rate_limited', '잠시 후'))
    await expect(refreshAccessToken()).rejects.toMatchObject({ status: 429 })
    expect(getAccessToken()).toBe('keep')
  })

  it('다른 탭이 방금 회전시켰으면(token_rotated) 잠깐 뒤 한 번 더 시도한다 (H32)', async () => {
    refresh
      .mockRejectedValueOnce(new ApiError(401, 'token_rotated', '잠시 후 다시 시도해 주세요.'))
      .mockResolvedValueOnce(token('after-rotate'))
    await expect(refreshAccessToken()).resolves.toBe('after-rotate')
    expect(refresh).toHaveBeenCalledTimes(2)
  })

  it('탭 사이에서는 같은 이름의 잠금(Web Locks)으로 차례대로 갱신한다 (H32)', async () => {
    const names: string[] = []
    vi.stubGlobal('navigator', {
      locks: { request: (name: string, fn: () => unknown) => (names.push(name), fn()) },
    })
    refresh.mockResolvedValue(token('locked'))
    await expect(refreshAccessToken()).resolves.toBe('locked')
    expect(names).toEqual(['sijak-auth-refresh'])
  })
})
