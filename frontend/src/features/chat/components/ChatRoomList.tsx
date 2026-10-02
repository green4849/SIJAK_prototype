import { Link } from 'react-router-dom'
import { formatRelative } from '@/shared/lib/datetime'
import { Alert } from '@/shared/ui/Alert'
import { Avatar } from '@/shared/ui/Avatar'
import { useChatRooms } from '../hooks/useChatRooms'
import styles from './ChatRoomList.module.css'

interface Props {
  roomHref: (roomId: string) => string
  /** 대화가 하나도 없을 때 보여 줄 안내 (예: 친구 찾기 버튼) */
  empty: React.ReactNode
}

/** 대화 목록 — 홈 '대화하기'에서 들어온다 */
export function ChatRoomList({ roomHref, empty }: Props) {
  const { data, loading, error } = useChatRooms()

  if (error) return <Alert>{error}</Alert>
  if (loading && !data) return <p role="status">불러오는 중…</p>
  if (!data || data.length === 0) return <>{empty}</>

  return (
    <ul className={styles.list}>
      {data.map((r) => (
        <li key={r.id}>
          <Link to={roomHref(r.id)} className={styles.item}>
            <Avatar name={r.peer.name} seed={r.peer.user_id} />
            <span className={styles.main}>
              <span className={styles.name}>{r.peer.name}님</span>
              <span className={styles.preview}>{r.last_message ?? '아직 나눈 이야기가 없어요'}</span>
            </span>
            <span className={styles.side}>
              {r.last_message_at && (
                <span className={styles.time}>{formatRelative(r.last_message_at)}</span>
              )}
              {r.unread > 0 && (
                <span className={styles.badge}>
                  <span className="sr-only">안 읽은 메시지 </span>
                  {r.unread}
                </span>
              )}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  )
}
