import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { Alert } from '@/shared/ui/Alert'
import type { ChatMessageData, ChatPeer } from '../api/chatApi'
import { useMessages } from '../hooks/useMessages'
import { useTopics } from '../hooks/useTopics'
import { Composer } from './Composer'
import { MessageList } from './MessageList'
import { TopicSuggestions } from './TopicSuggestions'
import styles from './ChatRoomView.module.css'

interface Props {
  roomId: string
  peer: ChatPeer
  blocked?: boolean
  renderAfterMessage?: (m: ChatMessageData) => ReactNode
}

/** ⑤ 대화방 본문 — 메시지 목록 + 아래 고정 입력줄 */
export function ChatRoomView({ roomId, peer, blocked = false, renderAfterMessage }: Props) {
  const { messages, loading, error, sendText, sendVoice } = useMessages(roomId)
  const topics = useTopics(roomId)
  const [prefill, setPrefill] = useState<{ text: string; seq: number }>()
  // 입력줄은 화면 아래 고정 — 대화 주제를 펼치면 높아지므로 실제 높이만큼 목록 아래를 비운다
  const barRef = useRef<HTMLDivElement>(null)
  const [barHeight, setBarHeight] = useState<number>()
  useEffect(() => {
    const el = barRef.current
    if (!el) return
    const ro = new ResizeObserver(() => setBarHeight(el.offsetHeight))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  // 입력줄이 높아지면(대화 주제 펼침 등) 맨 아래를 보던 중이면 따라 내려간다 — 마지막 말풍선·위험 경고가 입력줄 뒤로 숨지 않게
  const prevBar = useRef<number | undefined>(undefined)
  useLayoutEffect(() => {
    if (barHeight === undefined) return
    const grew = prevBar.current !== undefined && barHeight > prevBar.current
    prevBar.current = barHeight
    if (!grew) return
    const doc = document.documentElement
    const nearBottom = window.innerHeight + window.scrollY >= doc.scrollHeight - window.innerHeight * 0.5
    if (nearBottom) window.scrollTo({ top: doc.scrollHeight })
  }, [barHeight])
  // 받은 메시지에 위험 경고가 있으면 대화 주제는 접어 둔다 — 경고를 먼저 보게
  const hasWarning = messages.some((m) => !m.mine && m.warning)

  return (
    <div
      className={styles.view}
      style={barHeight ? ({ '--composer-h': `${barHeight}px` } as CSSProperties) : undefined}
    >
      <div className={styles.scroll}>
        {error && <Alert>{error}</Alert>}
        {loading ? (
          <p role="status">대화를 불러오는 중…</p>
        ) : (
          <MessageList peer={peer} messages={messages} renderAfter={renderAfterMessage} />
        )}
      </div>
      <div ref={barRef} className={styles.composer} data-bottom-bar>
        {blocked ? (
          <p className={styles.blocked} role="status">
            차단된 대화예요. 메시지를 보낼 수 없어요.
          </p>
        ) : (
          <>
            {!loading && topics.data && (
              <TopicSuggestions
                topics={topics.data}
                // 내가 아직 한마디도 안 했으면 펼쳐 둔다 — 첫마디가 제일 어렵다.
                // 단, 위험 경고가 있는 방은 접어 둔다 (경고가 먼저, 대화를 권하지 않는다)
                defaultOpen={!hasWarning && !messages.some((m) => m.mine)}
                onPick={(text) => setPrefill((p) => ({ text, seq: (p?.seq ?? 0) + 1 }))}
              />
            )}
            <Composer
              onSendText={sendText}
              onSendVoice={sendVoice}
              disabled={loading}
              prefill={prefill}
            />
          </>
        )}
      </div>
    </div>
  )
}
