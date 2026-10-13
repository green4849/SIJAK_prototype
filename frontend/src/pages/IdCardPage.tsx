import { IdCard } from 'lucide-react'
import { ButtonLink } from '@/shared/ui/Button'
import { TopBar } from '@/shared/ui/TopBar'
import styles from './InfoPage.module.css'
import { ICON, ICON_STROKE } from '@/shared/ui/icon'

/** ② → 신분증 인증 (프로토타입: 준비 중 안내 후 휴대폰 인증으로) */
export function IdCardPage() {
  return (
    <section className={styles.page}>
      <TopBar backTo="/login" />
      <IdCard aria-hidden="true" size={ICON.lg} strokeWidth={ICON_STROKE} className={styles.icon} />
      <h1 className={styles.title}>신분증 인증은 준비 중이에요</h1>
      <p className={styles.body}>지금은 휴대폰으로 인증해 주세요.</p>
      <div className={styles.actions}>
        <ButtonLink to="/login/phone" block large>
          휴대폰으로 인증하기
        </ButtonLink>
        <ButtonLink to="/login/help" block variant="secondary">
          도움받기
        </ButtonLink>
      </div>
    </section>
  )
}
