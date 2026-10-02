import { Headset } from 'lucide-react'
import { ButtonLink } from '@/shared/ui/Button'
import { TopBar } from '@/shared/ui/TopBar'
import styles from './InfoPage.module.css'

const STEPS = [
  '가족이나 복지관 직원에게 이 화면을 보여 주세요.',
  '도와주시는 분이 옆에서 휴대폰 인증을 함께 진행해요.',
  '인증번호는 어르신 휴대폰으로 와요. 휴대폰을 곁에 두세요.',
  '한 번만 하면 다음부터는 자동으로 들어가요.',
]

/** ② → 도움받기 — 가족·직원이 옆에서 함께 가입을 돕는 안내 */
export function AssistPage() {
  return (
    <section className={styles.page}>
      <TopBar backTo="/login" />
      <Headset aria-hidden="true" size="4em" className={styles.icon} />
      <h1 className={styles.title}>함께 해요</h1>
      <p className={styles.body}>혼자 하기 어려우시면 가까운 분께 부탁해 보세요.</p>
      <ol className={styles.steps}>
        {STEPS.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ol>
      <div className={styles.actions}>
        <ButtonLink to="/login/phone" block large>
          함께 인증 시작하기
        </ButtonLink>
      </div>
    </section>
  )
}
