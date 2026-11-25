import { describe, expect, it } from 'vitest'
import { safeErrorEvent } from './monitoring'

describe('오류 수집 개인정보 제거', () => {
  it('문구와 요청·사용자·대화·토큰을 버리고 배포 JS 위치만 남긴다', () => {
    const secret = '01012345678 private-chat bearer-token'
    const event = safeErrorEvent({
      type: undefined,
      message: secret,
      user: { email: secret },
      request: { url: `https://example.com/chats/${secret}`, data: secret },
      extra: { body: secret },
      breadcrumbs: [{ message: secret }],
      exception: { values: [{ type: 'Error', value: secret, stacktrace: { frames: [
        { filename: 'https://example.com/assets/index-abc.js', lineno: 12, vars: { token: secret } },
        { filename: `https://example.com/chats/${secret}` },
      ] } }] },
    })
    expect(JSON.stringify(event)).not.toContain(secret)
    expect(event.exception?.values?.[0]?.stacktrace?.frames?.[0]?.filename).toBe('/assets/index-abc.js')
    expect(event.exception?.values?.[0]?.stacktrace?.frames?.[1]?.filename).toBeUndefined()
  })
})
