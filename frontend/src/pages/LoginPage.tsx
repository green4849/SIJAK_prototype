import { Headset, IdCard, Smartphone } from 'lucide-react'
import { ActionCard } from '@/shared/ui/ActionCard'
import { LeafLogo } from '@/shared/ui/Brand'
import { TopBar } from '@/shared/ui/TopBar'
import styles from './LoginPage.module.css'

/**
 * ② 로그인 / 본인인증 방법 선택.
 * 시작 화면의 새싹이 이 화면 위쪽 작은 로고 자리로 날아와 붙는다 (A25 — 화면이 '이어지는' 느낌).
 */
export function LoginPage() {
  return (
    <section className={styles.page}>
      <TopBar backTo="/welcome" />

      <div className={styles.head}>
        <p className={styles.brand}>
          <LeafLogo size="40px" />
          시작
        </p>
        <h1 className={styles.title}>본인 확인을 할게요</h1>
        <p className={styles.lead}>실명이 확인된 우리 동네 이웃만 만나요.</p>
      </div>

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
