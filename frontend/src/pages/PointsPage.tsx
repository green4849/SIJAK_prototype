import { MissionCards, PointBalance, PointGuide, PointHistory } from '@/features/points'
import { TopBar } from '@/shared/ui/TopBar'
import { activitiesOf } from './routes'
import styles from './TabPage.module.css'

/** ⑨ → 내 포인트 (C12): 잔액 · 미션 · 모으는 방법·쓰는 곳 · 최근 내역 */
export function PointsPage() {
  return (
    <section className={styles.page}>
      <TopBar title="내 포인트" backTo="/me" />
      <PointBalance />
      <MissionCards />
      <PointGuide rateHref="/friends" volunteerHref={activitiesOf('volunteer')} />
      <PointHistory />
    </section>
  )
}
