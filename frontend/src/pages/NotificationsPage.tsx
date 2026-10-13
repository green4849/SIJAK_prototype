import { NotificationList } from '@/features/inbox'
import { TopBar } from '@/shared/ui/TopBar'
import styles from './TabPage.module.css'

/** ⑨ → 알림함: 친구 신청·위험 대화·활동·마음 날씨 소식을 한곳에 (푸시를 못 봤어도 여기서) */
export function NotificationsPage() {
  return (
    <section className={styles.page}>
      <TopBar title="알림함" backTo="/me" />
      <NotificationList />
    </section>
  )
}
