import { Brand, LeafLogo } from '@/shared/ui/Brand'
import { ButtonLink } from '@/shared/ui/Button'
import styles from './WelcomePage.module.css'

/**
 * ① 시작 화면 — 로고와 앱 이름이 중심, 풍경은 낮은 강조의 배경 (디자인 리뷰 ①).
 * 시작 버튼은 다른 화면의 주요 버튼과 같은 모양, 주변은 비워 둔다.
 */
export function WelcomePage() {
  return (
    <section className={styles.page}>
      <div className={styles.hero}>
        <LeafLogo size="96px" />
        <h1 className="sr-only">시작</h1>
        <Brand size="hero" leaf={false} tagline="시니어의 작지만 큰 변화" />
        <p className={styles.sub}>같은 동네, 좋은 이웃과 더 따뜻한 일상으로</p>
      </div>

      <div className={styles.hills} aria-hidden="true" />

      <ButtonLink to="/login" large block className={styles.cta}>
        시작하기
      </ButtonLink>
    </section>
  )
}
