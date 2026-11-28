import { Headset } from 'lucide-react'
import { ButtonLink } from '@/shared/ui/Button'
import { TopBar } from '@/shared/ui/TopBar'
import styles from './InfoPage.module.css'
import { ICON, ICON_STROKE } from '@/shared/ui/icon'

const STEPS = [
  '가족이나 복지관 직원에게 이 화면을 보여 주세요.',
  '도와주시는 분이 옆에서 시연용 로그인을 함께 진행해요.',
  '확인 번호는 화면에 표시돼요. 실제 문자는 오지 않아요.',
  '한 번만 하면 다음부터는 자동으로 들어가요.',
]

/** 시연용 — 가족·직원이 옆에서 가입을 돕는 안내 */
export function AssistPage() {
  return (
    <section className={styles.page}>
      <TopBar backTo="/login" />
      <Headset aria-hidden="true" size={ICON.lg} strokeWidth={ICON_STROKE} className={styles.icon} />
      <h1 className={styles.title}>함께 해요</h1>
      <ol className={styles.steps}>
        {STEPS.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ol>
      <div className={styles.actions}>
        <ButtonLink to="/login/phone" block large>
          함께 로그인 시작하기
        </ButtonLink>
      </div>
    </section>
  )
}
