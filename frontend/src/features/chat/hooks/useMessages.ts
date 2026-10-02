import { useCallback, useEffect, useRef, useState } from 'react'
import { errorMessage } from '@/shared/api/client'
import { chatApi, type ChatMessageData } from '../api/chatApi'
import { usePolling } from './usePolling'
import { refreshUnreadTotal } from './useUnreadTotal'

const MESSAGES_POLL_MS = 3_000 // 실시간 대신 폴링 (docs/deferred.md §2)

function merge(cur: ChatMessageData[], incoming: ChatMessageData[]) {
  if (incoming.length === 0) return cur
  const seen = new Set(cur.map((m) => m.id))
  const added = incoming.filter((m) => !seen.has(m.id))
  return added.length ? [...cur, ...added].sort((a, b) => a.id - b.id) : cur
}

/**
 * 대화방 메시지: 처음 불러오기 → 3초마다 새 메시지만 → 보내기.
 * 방이 바뀌면 컴포넌트를 새로 마운트한다 (ChatRoomView에 key=roomId) — 상태 초기화 불필요.
 */
export function useMessages(roomId: string) {
  const [messages, setMessages] = useState<ChatMessageData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const lastId = useRef(0)

  const append = useCallback((incoming: ChatMessageData[]) => {
    setMessages((cur) => {
      const next = merge(cur, incoming)
      lastId.current = next.at(-1)?.id ?? 0
      return next
    })
  }, [])

  useEffect(() => {
    let alive = true
    chatApi
      .messages(roomId)
      .then((m) => {
        if (alive) append(m)
        void refreshUnreadTotal() // 열면 읽음 처리됨 → 배지 바로 줄이기
      })
      .catch((e) => alive && setError(errorMessage(e)))
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
      void refreshUnreadTotal() // 대화방을 나갈 때도 (머무는 동안 읽은 것 반영)
    }
  }, [roomId, append])

  usePolling(
    async () => {
      try {
        append(await chatApi.messages(roomId, lastId.current))
      } catch {
        // 잠깐 끊겨도 다음 주기에 다시 시도
      }
    },
    MESSAGES_POLL_MS,
    !loading,
  )

  async function sendText(text: string) {
    append([await chatApi.sendText(roomId, text)])
  }

  async function sendVoice(audio: Blob, durationSec: number) {
    append([await chatApi.sendVoice(roomId, audio, durationSec)])
  }

  return { messages, loading, error, sendText, sendVoice }
}
