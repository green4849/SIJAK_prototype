import { Headset, IdCard, Smartphone } from 'lucide-react'
import { ActionCard } from '@/shared/ui/ActionCard'
import { TopBar } from '@/shared/ui/TopBar'
import styles from './LoginPage.module.css'

/** ② 로그인 / 본인인증 방법 선택 */
export function LoginPage() {
  return (
    <section className={styles.page}>
      <TopBar backTo="/welcome" />
      <h1 className={styles.title}>
        안녕하세요
        <br />
        <span className={styles.accent}>시작</span>입니다
      </h1>

      <div className={styles.options}>
        <ActionCard
          variant="primary"
          icon={Smartphone}
          title="휴대폰 인증"
          to="/login/phone"
        />
        <ActionCard
          accent="yellow"
          icon={IdCard}
          title="신분증 인증"
          description="준비 중"
          to="/login/id-card"
        />
        <ActionCard
          variant="subtle"
          icon={Headset}
          title="도움받기"
          to="/login/help"
        />
      </div>
    </section>
  )
}
