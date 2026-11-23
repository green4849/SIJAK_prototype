import { useState } from 'react'
import { useMyActivities } from '../hooks/useActivities'
import { ActivityList } from './ActivityList'
import styles from './NextActivity.module.css'

interface Props {
  detailHref: (id: string) => string
}

/**
 * 홈 '다음 모임' — 신청한 활동 중 아직 시작하지 않은 가장 가까운 것 하나.
 * 신청한 뒤 "언제였더라?"를 마이페이지까지 가지 않고 홈에서 본다. 없으면 그리지 않는다.
 */
export function NextActivity({ detailHref }: Props) {
  const { data } = useMyActivities('applied')
  const [now] = useState(() => Date.now()) // 화면을 연 때 기준 — 그리는 중에 시계를 읽지 않게
  const next = data?.find((a) => new Date(a.starts_at).getTime() > now)
  if (!next) return null

  return (
    <section className={styles.section} aria-labelledby="next-activity-title">
      <h2 id="next-activity-title" className={styles.heading}>
        다음 모임
      </h2>
      <ActivityList items={[next]} loading={false} error={null} detailHref={detailHref} emptyText="" />
    </section>
  )
}
