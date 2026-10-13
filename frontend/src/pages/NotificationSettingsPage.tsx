import { NotificationSettings } from '@/features/notification'
import { TopBar } from '@/shared/ui/TopBar'
import styles from './TabPage.module.css'

/** ⑨ → 알림 설정 (C12) */
export function NotificationSettingsPage() {
  return (
    <section className={styles.page}>
      <TopBar title="알림 설정" backTo="/me" />
      <NotificationSettings />
    </section>
  )
}
