import { MapPin, Sprout } from 'lucide-react'
import { AssessmentCards, IsolationSummary } from '@/features/wellbeing'
import { ActionCard } from '@/shared/ui/ActionCard'
import { TopBar } from '@/shared/ui/TopBar'
import { assessment } from './routes'
import styles from './TabPage.module.css'

/** ⑨ → 마음 건강 (C11): 마음 날씨(고립 지수) · 요인 · 4주 변화 · 마음 점검 · 기분 나아지는 곳 */
export function WellbeingPage() {
  return (
    <section className={styles.page}>
      <TopBar title="마음 건강" backTo="/me" />
      <IsolationSummary />
      <AssessmentCards hrefOf={assessment} />
      <ActionCard icon={Sprout} accent="sky" title="말동무와 이야기하기" to="/companion" />
      <ActionCard icon={MapPin} accent="yellow" title="동네 모임 나가 보기" to="/activities" />
    </section>
  )
}
