import { AssessmentCards, MoodSproutCard, RelationSummary } from '@/features/wellbeing'
import { TopBar } from '@/shared/ui/TopBar'
import { assessment, who5History } from './routes'
import styles from './TabPage.module.css'

/** 마음 건강 수치에서 바로 이어 갈 곳 */
const LINKS = {
  companion: '/companion',
  activities: '/activities',
  chats: '/chats',
  brain: '/brain',
  notifications: '/notifications',
  moodCheck: assessment('phq9'),
  sos: '/sos',
}

/** ⑨ → 마음 건강 (C11): 마음 날씨(사회적 관계 지수) · 요즘 마음 · 요인과 해 볼 일 · 4주 변화 · 마음 점검 */
export function WellbeingPage() {
  return (
    <section className={styles.page}>
      <TopBar title="마음 건강" backTo="/me" />
      {/* 마음 새싹 — WHO-5 가 높을수록 진해진다 (누르면 점수 변화 그래프) */}
      <MoodSproutCard startHref={assessment('who5')} historyHref={who5History} />
      <RelationSummary links={LINKS} />
      <AssessmentCards hrefOf={assessment} />
    </section>
  )
}
