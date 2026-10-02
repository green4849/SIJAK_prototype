import { useParams } from 'react-router-dom'
import { ChatRoomView, useChatRoom } from '@/features/chat'
import { Alert } from '@/shared/ui/Alert'
import { Avatar } from '@/shared/ui/Avatar'
import { TopBar } from '@/shared/ui/TopBar'
import styles from './ChatRoomPage.module.css'

/** ⑤ 대화 화면 */
export function ChatRoomPage() {
  const { roomId = '' } = useParams()
  const { data: room, error } = useChatRoom(roomId)

  if (error)
    return (
      <>
        <TopBar title="대화하기" backTo="/chats" />
        <Alert>{error}</Alert>
      </>
    )
  if (!room) return <p role="status">불러오는 중…</p>

  return (
    <section className={styles.page}>
      <TopBar backTo="/chats" />
      <header className={styles.peer}>
        <Avatar name={room.peer.name} seed={room.peer.user_id} />
        <div>
          <h1 className={styles.name}>{room.peer.name}님</h1>
          <p className={styles.meta}>
            {room.peer.age}세 · {room.peer.region_name}
          </p>
        </div>
      </header>
      <ChatRoomView key={room.id} roomId={room.id} peer={room.peer} />
    </section>
  )
}
