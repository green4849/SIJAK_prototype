import { useLocation, useParams } from 'react-router-dom'
import { useAuth } from '@/features/auth'
import { SijagiStill } from '@/features/guide'
import {
  AssessmentFlow,
  HealthConsentCard,
  Who5Flow,
  type AssessmentKind,
  type Who5Links,
} from '@/features/wellbeing'
import { TopBar } from '@/shared/ui/TopBar'
import { NotFoundPage } from './NotFoundPage'
import { activitiesOf, legalDoc, who5History } from './routes'
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

/**
 * 마음 건강 → 자가평가 (PHQ-9 · GAD-7 · WHO-5) — 한 화면에 한 문항.
 * 결과는 민감정보(건강)라 따로 동의한 분만 저장한다 — 동의 전이면 동의 카드가 먼저 (B6)
 */
export function AssessmentPage() {
  const { kind = '' } = useParams()
  const { user, updateUser } = useAuth()
  // 가입 후 친구 선택 다음 WHO-5 — 뒤로 가기 대신 '나중에 할게요'
  const afterSignup = (useLocation().state as { afterSignup?: boolean } | null)?.afterSignup
  if (!isKind(kind)) return <NotFoundPage />
  return (
    <section className={styles.page}>
      <TopBar title={TITLES[kind]} back={!afterSignup} backTo="/me/wellbeing" />
      {user && !user.health_consent ? (
        <HealthConsentCard
          docHref={legalDoc('health')}
          laterTo={afterSignup ? '/' : '/me/wellbeing'}
          onAgreed={() => updateUser({ ...user, health_consent: true })}
        />
      ) : kind === 'who5' ? (
        <Who5Flow links={WHO5_LINKS} later={afterSignup ? '/' : undefined} art={<SijagiStill />} />
      ) : (
        <AssessmentFlow key={kind} kind={kind} doneHref="/me/wellbeing" />
      )}
    </section>
  )
}
