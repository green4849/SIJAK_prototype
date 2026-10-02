import { ChevronRight, MapPin } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Alert } from '@/shared/ui/Alert'
import type { ActivityData } from '../api/activityApi'
import { ActivityThumb } from './ActivityThumb'
import styles from './ActivityList.module.css'

interface Props {
  items: ActivityData[] | null
  loading: boolean
  error: string | null
  detailHref: (id: string) => string
  emptyText: string
}

/** ⑥ 활동 목록 — 한 줄 전체가 눌리는 큰 항목 */
export function ActivityList({ items, loading, error, detailHref, emptyText }: Props) {
  if (error) return <Alert>{error}</Alert>
  if (loading && !items) return <p role="status">불러오는 중…</p>
  if (!items || items.length === 0) return <p className={styles.empty}>{emptyText}</p>

  return (
    <ul className={styles.list}>
      {items.map((a) => (
        <li key={a.id}>
          <Link to={detailHref(a.id)} className={styles.item}>
            <ActivityThumb kind={a.image_kind} />
            <span className={styles.main}>
              <span className={styles.title}>{a.title}</span>
              <span className={styles.meta}>{a.schedule_text}</span>
              <span className={styles.meta}>
                <MapPin aria-hidden="true" size="0.9em" /> {a.place}
              </span>
              {(a.applied || a.is_full) && (
                <span className={styles.badge} data-kind={a.applied ? 'applied' : 'full'}>
                  {a.applied ? '신청했어요' : '마감'}
                </span>
              )}
            </span>
            <ChevronRight aria-hidden="true" className={styles.chevron} />
          </Link>
        </li>
      ))}
    </ul>
  )
}
