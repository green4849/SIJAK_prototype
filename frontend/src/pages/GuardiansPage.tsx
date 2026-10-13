import { GuardianManager } from '@/features/emergency'
import { TopBar } from '@/shared/ui/TopBar'
import styles from './TabPage.module.css'

/** ⑨ → 보호자 연결 (C10): 긴급 도움을 누르면 알림이 가는 사람 (3명까지) */
export function GuardiansPage() {
  return (
    <section className={styles.page}>
      <TopBar title="보호자 연결" />
      <GuardianManager />
    </section>
  )
}
