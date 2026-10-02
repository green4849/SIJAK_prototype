import { ChatRoomList } from '@/features/chat'
import { ButtonLink } from '@/shared/ui/Button'
import { TopBar } from '@/shared/ui/TopBar'
import { chatRoom } from './routes'
import styles from './InfoPage.module.css'

/** 홈 → 대화하기: 대화 목록 */
export function ChatListPage() {
  return (
    <>
      <TopBar title="대화하기" backTo="/" />
      <ChatRoomList
        roomHref={chatRoom}
        empty={
          <div className={styles.page}>
            <p className={styles.body}>
              아직 대화가 없어요.
              <br />
              친구가 된 이웃과 이야기를 나눌 수 있어요.
            </p>
            <div className={styles.actions}>
              <ButtonLink to="/friends" block large>
                친구 찾으러 가기
              </ButtonLink>
            </div>
          </div>
        }
      />
    </>
  )
}
