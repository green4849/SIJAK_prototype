import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { ChatRoomView, useChatRoom, type ChatMessageData } from '@/features/chat'
import { ReportSheet, RiskWarning, SafetyMenu } from '@/features/safety'
import { Alert } from '@/shared/ui/Alert'
import { Avatar } from '@/shared/ui/Avatar'
import { TopBar } from '@/shared/ui/TopBar'
import styles from './ChatRoomPage.module.css'

/** ⑤ 대화 화면 — chat(대화) + safety(경고·신고·차단)를 여기서 조합 */
export function ChatRoomPage() {
  const { roomId = '' } = useParams()
  const { data: room, error, reload } = useChatRoom(roomId)
  const [reportMessage, setReportMessage] = useState<number | null>(null)

  if (error)
    return (
      <>
        <TopBar title="대화하기" backTo="/chats" />
        <Alert>{error}</Alert>
      </>
    )
  if (!room) return <p role="status">불러오는 중…</p>

  const renderWarning = (m: ChatMessageData) =>
    m.warning && !room.blocked ? (
      <RiskWarning warning={m.warning} onReport={() => setReportMessage(m.id)} />
    ) : null

  return (
    <section className={styles.page}>
      <TopBar
        backTo="/chats"
        right={
          <SafetyMenu
            userId={room.peer.user_id}
            name={room.peer.name}
            blocked={room.blocked}
            onChanged={reload}
          />
        }
      />
      <header className={styles.peer}>
        <Avatar name={room.peer.name} seed={room.peer.user_id} size="header" />
        <div>
          <h1 className={styles.name}>{room.peer.name}님</h1>
          <p className={styles.meta}>
            {room.peer.age}세 · {room.peer.region_name}
          </p>
        </div>
      </header>

      <ChatRoomView
        key={room.id}
        roomId={room.id}
        peer={room.peer}
        blocked={room.blocked}
        renderAfterMessage={renderWarning}
      />

      <ReportSheet
        open={reportMessage !== null}
        targetUserId={room.peer.user_id}
        targetName={room.peer.name}
        messageId={reportMessage ?? undefined}
        onClose={() => setReportMessage(null)}
        onDone={() => {
          setReportMessage(null)
          void reload()
        }}
      />
    </section>
  )
}
