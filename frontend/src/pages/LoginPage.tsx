import { Headset, IdCard, Smartphone } from 'lucide-react'
import { ActionCard } from '@/shared/ui/ActionCard'
import { Brand } from '@/shared/ui/Brand'
import { TopBar } from '@/shared/ui/TopBar'
import styles from './LoginPage.module.css'

/** ② 로그인 / 본인인증 방법 선택 */
export function LoginPage() {
  return (
    <section className={styles.page}>
      <TopBar backTo="/welcome" />
      <div>
        <h1 className={styles.title}>
          안녕하세요
          <br />
          <span className={styles.accent}>시작</span>입니다
        </h1>
        <p className={styles.lead}>안전한 이용을 위해 본인인증을 진행해 주세요.</p>
      </div>

      <div className={styles.options}>
        <ActionCard
          variant="primary"
          icon={Smartphone}
          title="휴대폰 인증"
          description="가장 간편해요"
          to="/login/phone"
        />
        <ActionCard
          accent="yellow"
          icon={IdCard}
          title="신분증 인증"
          description="주민등록증·운전면허증 (준비 중)"
          to="/login/id-card"
        />
        <ActionCard
          variant="subtle"
          icon={Headset}
          title="도움받기"
          description="가족·직원이 도와드려요"
          to="/login/help"
        />
      </div>

      <footer className={styles.footer}>
        <Brand tagline="같은 동네, 좋은 이웃과" />
      </footer>
    </section>
  )
}
