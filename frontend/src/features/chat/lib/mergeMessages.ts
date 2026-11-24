import type { ChatMessageData } from '../api/chatApi'

/**
 * 폴링으로 받은 메시지를 지금 목록에 합친다 — 이미 있는 id는 건너뛰고 id 순으로.
 * 새 것이 없으면 같은 배열을 그대로 돌려준다 (화면을 다시 그리지 않게).
 */
export function mergeMessages(cur: ChatMessageData[], incoming: ChatMessageData[]) {
  if (incoming.length === 0) return cur
  const seen = new Set(cur.map((m) => m.id))
  const added = incoming.filter((m) => !seen.has(m.id))
  return added.length ? [...cur, ...added].sort((a, b) => a.id - b.id) : cur
}
