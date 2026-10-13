import { useParams } from 'react-router-dom'
import { AssessmentFlow, type AssessmentKind } from '@/features/wellbeing'
import { TopBar } from '@/shared/ui/TopBar'
import { NotFoundPage } from './NotFoundPage'
import styles from './TabPage.module.css'

const TITLES: Record<AssessmentKind, string> = { phq9: '기분 점검', gad7: '걱정 점검' }
const isKind = (k: string): k is AssessmentKind => k in TITLES

/** 마음 건강 → 자가평가 (PHQ-9 · GAD-7) — 한 화면에 한 문항 */
export function AssessmentPage() {
  const { kind = '' } = useParams()
  if (!isKind(kind)) return <NotFoundPage />
  return (
    <section className={styles.page}>
      <TopBar title={TITLES[kind]} backTo="/me/wellbeing" />
      <AssessmentFlow key={kind} kind={kind} doneHref="/me/wellbeing" />
    </section>
  )
}
