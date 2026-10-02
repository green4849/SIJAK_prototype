import { ArrowRight } from 'lucide-react'
import { Brand, LeafLogo } from '@/shared/ui/Brand'
import { ButtonLink } from '@/shared/ui/Button'
import styles from './WelcomePage.module.css'

/** ① 시작 화면 */
export function WelcomePage() {
  return (
    <section className={styles.page}>
      <div className={styles.hero}>
        <div className={styles.emblem}>
          <LeafLogo size="5.5em" />
        </div>
        <h1 className="sr-only">시작</h1>
        <Brand size="hero" leaf={false} tagline="시니어의 작지만 큰 변화" />
        <p className={styles.sub}>같은 동네, 좋은 이웃과 더 따뜻한 일상으로</p>
      </div>

      <div className={styles.hills} aria-hidden="true" />

      <ButtonLink to="/login" large block className={styles.cta}>
        시작하기 <ArrowRight aria-hidden="true" />
      </ButtonLink>
    </section>
  )
}
