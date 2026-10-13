import { WithdrawForm } from '@/features/auth'
import { TopBar } from '@/shared/ui/TopBar'
import styles from './TabPage.module.css'

/** ⑨ → 회원 탈퇴 (B3) */
export function WithdrawPage() {
  return (
    <section className={styles.page}>
      <TopBar title="회원 탈퇴" backTo="/me" />
      <WithdrawForm />
    </section>
  )
}
