import type { ReactNode } from 'react'
import { Alert } from '@/shared/ui/Alert'
import type { ChatMessageData, ChatPeer } from '../api/chatApi'
import { useMessages } from '../hooks/useMessages'
import { Composer } from './Composer'
import { MessageList } from './MessageList'
import styles from './ChatRoomView.module.css'

interface Props {
  roomId: string
  peer: ChatPeer
  renderAfterMessage?: (m: ChatMessageData) => ReactNode
}

/** ⑤ 대화방 본문 — 메시지 목록 + 아래 고정 입력줄 */
export function ChatRoomView({ roomId, peer, renderAfterMessage }: Props) {
  const { messages, loading, error, sendText, sendVoice } = useMessages(roomId)

  return (
    <div className={styles.view}>
      <div className={styles.scroll}>
        {error && <Alert>{error}</Alert>}
        {loading ? (
          <p role="status">대화를 불러오는 중…</p>
        ) : (
          <MessageList peer={peer} messages={messages} renderAfter={renderAfterMessage} />
        )}
      </div>
      <div className={styles.composer}>
        <Composer onSendText={sendText} onSendVoice={sendVoice} disabled={loading} />
      </div>
    </div>
  )
}
