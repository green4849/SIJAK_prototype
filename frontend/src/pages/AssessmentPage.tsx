import { useLocation, useParams } from 'react-router-dom'
import { SijagiStill } from '@/features/guide'
import { AssessmentFlow, Who5Flow, type AssessmentKind, type Who5Links } from '@/features/wellbeing'
import { TopBar } from '@/shared/ui/TopBar'
import { NotFoundPage } from './NotFoundPage'
import { activitiesOf, who5History } from './routes'
import styles from './TabPage.module.css'

const TITLES: Record<AssessmentKind, string> = { phq9: '기분 점검', gad7: '걱정 점검', who5: '마음 건강 살펴보기' }
const isKind = (k: string): k is AssessmentKind => k in TITLES

const WHO5_LINKS: Who5Links = {
  chats: '/chats',
  walk: activitiesOf('walking'),
  move: activitiesOf('health'),
  activities: '/activities',
  history: who5History,
  home: '/',
}

/** 마음 건강 → 자가평가 (PHQ-9 · GAD-7 · WHO-5) — 한 화면에 한 문항 */
export function AssessmentPage() {
  const { kind = '' } = useParams()
  // 가입 직후(보안 안내 다음) 첫 WHO-5 — 뒤로 가기 대신 '나중에 할게요'
  const afterSignup = (useLocation().state as { afterSignup?: boolean } | null)?.afterSignup
  if (!isKind(kind)) return <NotFoundPage />
  return (
    <section className={styles.page}>
      <TopBar title={TITLES[kind]} back={!afterSignup} backTo="/me/wellbeing" />
      {kind === 'who5' ? (
        <Who5Flow links={WHO5_LINKS} later={afterSignup ? '/' : undefined} art={<SijagiStill />} />
      ) : (
        <AssessmentFlow key={kind} kind={kind} doneHref="/me/wellbeing" />
      )}
    </section>
  )
}
