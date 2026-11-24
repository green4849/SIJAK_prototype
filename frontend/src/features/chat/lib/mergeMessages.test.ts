import { describe, expect, it } from 'vitest'
import type { ChatMessageData } from '../api/chatApi'
import { mergeMessages } from './mergeMessages'

const msg = (id: number, body = `메시지 ${id}`) => ({ id, body }) as unknown as ChatMessageData

describe('mergeMessages — 폴링으로 받은 메시지 합치기', () => {
  it('새 메시지를 id 순으로 뒤에 붙인다', () => {
    const r = mergeMessages([msg(1), msg(3)], [msg(2), msg(4)])
    expect(r.map((m) => m.id)).toEqual([1, 2, 3, 4])
  })

  it('이미 있는 id는 두 번 넣지 않는다 (보낸 직후 폴링에 같은 메시지가 와도)', () => {
    const r = mergeMessages([msg(1), msg(2)], [msg(2, '다른 본문'), msg(3)])
    expect(r.map((m) => m.id)).toEqual([1, 2, 3])
    expect(r[1].body).toBe('메시지 2') // 먼저 있던 것을 지킨다
  })

  it('새 것이 없으면 같은 배열을 그대로 — 화면을 다시 그리지 않게', () => {
    const cur = [msg(1)]
    expect(mergeMessages(cur, [])).toBe(cur)
    expect(mergeMessages(cur, [msg(1)])).toBe(cur)
  })
})
