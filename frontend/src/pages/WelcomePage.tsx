import { useState } from 'react'
import { FontScaleToggle } from '@/shared/a11y/FontScaleToggle'
import { Brand, LeafLogo } from '@/shared/ui/Brand'
import { ButtonLink } from '@/shared/ui/Button'
import { WelcomeHills } from '@/shared/ui/illustrations/Scenes'
import styles from './WelcomePage.module.css'

const SEEN_KEY = 'wipi.welcomeSeen'

/** 처음 열 때만 전체 등장 연출, 그 뒤로는 짧게 (A22) */
function useIntro(): 'full' | 'quick' {
  const [intro] = useState<'full' | 'quick'>(() => {
    try {
      if (localStorage.getItem(SEEN_KEY)) return 'quick'
      localStorage.setItem(SEEN_KEY, '1')
    } catch {
      // 저장 못 하면 매번 처음처럼
    }
    return 'full'
  })
  return intro
}

/**
 * ① 시작 화면 — 로고와 앱 이름이 중심, 풍경은 낮은 강조의 배경 (디자인 리뷰 ①).
 * 로고 → 슬로건 → 시작하기 버튼을 한 묶음으로 가운데에, 언덕은 맨 아래 배경 (A22).
 */
export function WelcomePage() {
  const intro = useIntro()

  return (
    <section className={styles.page} data-intro={intro}>
      <FontScaleToggle className={styles.fontToggle} />

      <div className={styles.spaceTop} />
      <div className={styles.hero}>
        <LeafLogo size="116px" />
        <h1 className="sr-only">시작</h1>
        <Brand
          size="hero"
          leaf={false}
          tagline={
            <>
              <b>시</b>니어의 <b>작</b>지만 큰 변화
            </>
          }
        />
        <ButtonLink to="/login" className={styles.cta}>
          시작하기
        </ButtonLink>
      </div>
      <div className={styles.spaceBottom} />

      <div className={styles.hills}>
        <WelcomeHills />
      </div>
    </section>
  )
}
