import { CompanionAvatar, CompanionChat } from '@/features/companion'
import { TopBar } from '@/shared/ui/TopBar'
import { activityDetail } from './routes'
import styles from './ChatRoomPage.module.css'

/** 홈 → 말동무 (C8): 언제든 말 걸 수 있는 AI 친구. 동네 활동 추천은 지역생활 상세로 */
export function CompanionPage() {
  return (
    <section className={styles.page}>
      <TopBar backTo="/" />
      <header className={styles.peer}>
        <CompanionAvatar size="header" />
        <div>
          <h1 className={styles.name}>말동무</h1>
          <p className={styles.meta}>AI 친구</p>
        </div>
      </header>
      <CompanionChat activityHref={activityDetail} />
    </section>
  )
}
