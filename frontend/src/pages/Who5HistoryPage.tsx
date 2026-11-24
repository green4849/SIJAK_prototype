import { Who5History } from '@/features/wellbeing'
import { TopBar } from '@/shared/ui/TopBar'
import { assessment } from './routes'
import styles from './TabPage.module.css'

/** 마음 건강 살펴보기(WHO-5) — 나의 이전 결과 */
export function Who5HistoryPage() {
  return (
    <section className={styles.page}>
      <TopBar title="나의 이전 결과" backTo="/me/wellbeing" />
      <Who5History startHref={assessment('who5')} />
    </section>
  )
}
