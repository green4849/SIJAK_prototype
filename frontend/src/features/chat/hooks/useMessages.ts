import { useCallback, useEffect, useRef, useState } from 'react'
import { errorMessage } from '@/shared/api/client'
import { chatApi, type ChatMessageData } from '../api/chatApi'
import { mergeMessages } from '../lib/mergeMessages'
import { usePolling } from './usePolling'
import { refreshUnreadTotal } from './useUnreadTotal'

const MESSAGES_POLL_MS = 3_000 // 실시간 대신 폴링 (docs/deferred.md §2)
const MESSAGE_PAGE_SIZE = 100

/**
 * 대화방 메시지: 처음 불러오기 → 3초마다 새 메시지만 → 보내기.
 * 방이 바뀌면 컴포넌트를 새로 마운트한다 (ChatRoomView에 key=roomId) — 상태 초기화 불필요.
 */
export function useMessages(roomId: string) {
  const [messages, setMessages] = useState<ChatMessageData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasOlder, setHasOlder] = useState(false)
  const [loadingOlder, setLoadingOlder] = useState(false)
  const [olderError, setOlderError] = useState<string | null>(null)
  const lastId = useRef(0)
  const firstId = useRef(0)
  const olderBusy = useRef(false)

  const append = useCallback((incoming: ChatMessageData[]) => {
    setMessages((cur) => {
      const next = mergeMessages(cur, incoming)
      lastId.current = next.at(-1)?.id ?? 0
      firstId.current = next[0]?.id ?? 0
      return next
    })
  }, [])

  useEffect(() => {
    let alive = true
    chatApi
      .messages(roomId)
      .then((m) => {
        if (alive) {
          append(m)
          setHasOlder(m.length === MESSAGE_PAGE_SIZE)
        }
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

  async function loadOlder(): Promise<number> {
    if (olderBusy.current || !hasOlder || !firstId.current) return 0
    olderBusy.current = true
    setLoadingOlder(true)
    setOlderError(null)
    try {
      const older = await chatApi.olderMessages(roomId, firstId.current)
      setHasOlder(older.length === MESSAGE_PAGE_SIZE)
      append(older)
      return older.length
    } catch (e) {
      setOlderError(errorMessage(e))
      return 0
    } finally {
      olderBusy.current = false
      setLoadingOlder(false)
    }
  }

  return { messages, loading, error, hasOlder, loadingOlder, olderError, loadOlder, sendText, sendVoice }
}
