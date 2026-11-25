import { MyConsents } from '@/features/auth'
import { wellbeingApi } from '@/features/wellbeing'
import { TopBar } from '@/shared/ui/TopBar'
import { legalDoc } from './routes'
import styles from './TabPage.module.css'

/** ⑨ → 약관 및 동의 (B6) */
export function MyConsentsPage() {
  return (
    <section className={styles.page}>
      <TopBar title="약관 및 동의" backTo="/me" />
      <MyConsents
        docHref={legalDoc}
        leaveHref="/me/leave"
        setHealth={async (agreed) => {
          await wellbeingApi.setHealthConsent(agreed)
        }}
      />
    </section>
  )
}
