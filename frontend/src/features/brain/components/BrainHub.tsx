import { Calculator, CircleCheck, Flame, LayoutGrid } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ActionCard } from '@/shared/ui/ActionCard'
import { Alert } from '@/shared/ui/Alert'
import { ICON, ICON_STROKE } from '@/shared/ui/icon'
import type { BrainGame, BrainStats } from '../api/brainApi'
import { useBrainStats } from '../hooks/useBrain'
import styles from './Brain.module.css'

const DAYS = ['월', '화', '수', '목', '금', '토', '일']

function streakText(s: BrainStats) {
  if (s.today_done) return s.streak_days > 1 ? `${s.streak_days}일째 이어 하고 있어요` : '오늘도 했어요'
  return s.streak_days > 0 ? `${s.streak_days}일 이어 했어요 · 오늘도 해요` : '오늘 시작해 볼까요?'
}

/** 홈에 놓는 작은 카드 — 연속 일수 + 바로 하기 */
export function BrainTodayCard({ to }: { to: string }) {
  const { data } = useBrainStats()
  return (
    <Link to={to} className={styles.today}>
      <span className={styles.todayIcon} aria-hidden="true">
        {data?.today_done ? <CircleCheck size={ICON.md} strokeWidth={ICON_STROKE} /> : <Flame size={ICON.md} strokeWidth={ICON_STROKE} />}
      </span>
      <span className={styles.todayText}>
        <span className={styles.todayTitle}>오늘의 두뇌 운동</span>
        {data && <span className={styles.todayMeta}>{streakText(data)}</span>}
      </span>
    </Link>
  )
}

/** 두뇌 운동 첫 화면 — 이번 주 한 날 + 게임 두 개 */
export function BrainHub({ gameHref }: { gameHref: (g: BrainGame) => string }) {
  const { data, error } = useBrainStats()
  if (error) return <Alert>{error}</Alert>
  if (!data) return <p role="status">불러오는 중…</p>
  const best = (g: BrainGame) => data.best.find((b) => b.game === g)?.text
  return (
    <>
      <section className={styles.card} aria-labelledby="week-title">
        <h2 id="week-title" className={styles.cardTitle}>
          {streakText(data)}
        </h2>
        <ol className={styles.week} aria-label="이번 주">
          {data.week.map((done, i) => (
            <li key={DAYS[i]} className={styles.day} data-done={done}>
              <span className={styles.dot} aria-hidden="true">
                {done ? '✓' : ''}
              </span>
              <span>{DAYS[i]}</span>
              <span className="sr-only">{done ? '함' : '안 함'}</span>
            </li>
          ))}
        </ol>
      </section>
      <ActionCard icon={LayoutGrid} accent="pink" title="짝 맞추기" description={best('match')} to={gameHref('match')} />
      <ActionCard icon={Calculator} accent="sky" title="셈하기" description={best('calc')} to={gameHref('calc')} />
    </>
  )
}
