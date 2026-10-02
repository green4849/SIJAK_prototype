import { Sprout } from 'lucide-react'
import { ButtonLink } from '@/shared/ui/Button'
import { TopBar } from '@/shared/ui/TopBar'
import styles from './InfoPage.module.css'

interface Props {
  title: string
  /** 탭 화면이면 뒤로가기 없음 */
  tab?: boolean
}

/** 아직 만들지 않은 스테이지의 자리 — 해당 스테이지에서 실제 화면으로 교체한다 */
export function ComingSoonPage({ title, tab = false }: Props) {
  return (
    <section className={styles.page}>
      <TopBar title={title} back={!tab} />
      <Sprout aria-hidden="true" size="4em" className={styles.icon} />
      <h2 className={styles.title}>곧 만나요</h2>
      <p className={styles.body}>
        &lsquo;{title}&rsquo; 화면을 열심히 준비하고 있어요.
      </p>
      {!tab && (
        <div className={styles.actions}>
          <ButtonLink to="/" block variant="secondary">
            홈으로
          </ButtonLink>
        </div>
      )}
    </section>
  )
}
