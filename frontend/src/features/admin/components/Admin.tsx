import { Bot, Flag, TriangleAlert } from 'lucide-react'
import { formatRelative } from '@/shared/lib/datetime'
import { Alert } from '@/shared/ui/Alert'
import { Button } from '@/shared/ui/Button'
import { ICON, ICON_STROKE } from '@/shared/ui/icon'
import type { AdminCase, CaseStatus } from '../api/adminApi'
import { useCases, useWatchList } from '../hooks/useAdmin'
import styles from './Admin.module.css'

const STATUS: Record<CaseStatus, string> = {
  open: '처리 전',
  warned: '경고함',
  suspended: '이용 정지',
  banned: '영구 제한',
  dismissed: '문제없음',
}

const LEVEL = ['', '주의', '경고', '위험']

/** 신고·위험 대화 처리 — 처리 전이 위로, 위험도 높은 순 */
export function CaseQueue() {
  const { data, error, loading, act, busy } = useCases()
  if (error) return <Alert>{error}</Alert>
  if (loading && !data) return <p role="status">불러오는 중…</p>
  if (!data?.length) return <p className={styles.empty}>처리할 신고가 없어요.</p>
  const open = data.filter((c) => c.status === 'open').length
  return (
    <>
      <p className={styles.summary}>처리 전 {open}건 · 전체 {data.length}건</p>
      <ul className={styles.list}>
        {data.map((c) => (
          <CaseCard key={c.id} c={c} busy={busy === c.id} onAct={(a) => void act(c, a)} />
        ))}
      </ul>
    </>
  )
}

function CaseCard({ c, busy, onAct }: { c: AdminCase; busy: boolean; onAct: (a: 'warn' | 'suspend' | 'ban' | 'dismiss') => void }) {
  const SourceIcon = c.source === 'auto' ? Bot : Flag
  return (
    <li className={styles.card} data-open={c.status === 'open'} aria-label={`${c.target_name}님 ${c.source === 'auto' ? '자동 감지' : '신고'}`}>
      <div className={styles.head}>
        <span className={styles.level} data-level={c.level}>
          <TriangleAlert aria-hidden="true" size={ICON.inline} strokeWidth={ICON_STROKE} /> {LEVEL[c.level] ?? ''}
        </span>
        <span className={styles.status} data-status={c.status}>
          {STATUS[c.status]}
        </span>
      </div>
      <p className={styles.target}>{c.target_name}님</p>
      <p className={styles.meta}>
        <SourceIcon aria-hidden="true" size={ICON.inline} strokeWidth={ICON_STROKE} />{' '}
        {c.source === 'auto' ? '자동 감지' : `신고 ${c.reports_count}건`} · {formatRelative(c.created_at)}
      </p>
      <p className={styles.reasons}>{c.reasons.join(' · ')}</p>
      {c.excerpt && <blockquote className={styles.excerpt}>{c.excerpt}</blockquote>}
      {c.status === 'open' && (
        <div className={styles.actions}>
          <Button variant="secondary" disabled={busy} onClick={() => onAct('warn')}>
            경고
          </Button>
          <Button variant="secondary" disabled={busy} onClick={() => onAct('suspend')}>
            7일 정지
          </Button>
          <Button variant="danger" disabled={busy} onClick={() => onAct('ban')}>
            영구 제한
          </Button>
          <Button variant="secondary" disabled={busy} onClick={() => onAct('dismiss')}>
            문제없음
          </Button>
        </div>
      )}
    </li>
  )
}

/** 돌봄이 필요한 이웃 — 사회적 관계 지수 낮은 순 (복지기관 담당자용, 보고서 4.5.3 '긴급' 단계 모니터링) */
export function WatchList() {
  const { data, error, loading } = useWatchList()
  if (error) return <Alert>{error}</Alert>
  if (loading && !data) return <p role="status">불러오는 중…</p>
  if (!data?.length) return <p className={styles.empty}>살펴볼 이웃이 없어요.</p>
  return (
    <ul className={styles.list}>
      {data.map((w) => (
        <li key={w.user_id} className={styles.card} data-open="true">
          <div className={styles.head}>
            <span className={styles.level} data-level={w.relation_score <= 20 ? 3 : w.relation_score <= 40 ? 2 : 1}>
              사회적 관계 지수 {w.relation_score}
            </span>
            {w.guardian_notified && <span className={styles.status}>보호자에게 알림</span>}
          </div>
          <p className={styles.target}>
            {w.name}님 <span className={styles.meta}>{w.age}세 · {w.region_name}</span>
          </p>
          <p className={styles.reasons}>{w.signal}</p>
          <p className={styles.meta}>마지막 접속 {w.last_seen_text}</p>
        </li>
      ))}
    </ul>
  )
}
