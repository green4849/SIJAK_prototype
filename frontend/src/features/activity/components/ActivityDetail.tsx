import { CalendarDays, FileText, Heart, MapPin, Users } from 'lucide-react'
import type { ReactNode } from 'react'
import { formatDate, formatTime } from '@/shared/lib/datetime'
import { Alert } from '@/shared/ui/Alert'
import { Button } from '@/shared/ui/Button'
import { useActivity } from '../hooks/useActivities'
import { ActivityThumb } from './ActivityThumb'
import styles from './ActivityDetail.module.css'

function Row({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className={styles.row}>
      <dt className={styles.label}>
        {icon}
        {label}
      </dt>
      <dd className={styles.value}>{children}</dd>
    </div>
  )
}

/** ⑦ 지역 활동 상세 — 일시·장소·참여 인원·소개 + 아래 고정 '신청하기' */
export function ActivityDetail({ id, header }: { id: string; header: (liked: ReactNode) => ReactNode }) {
  const { data: a, error, pending, actionError, apply, cancel, toggleLike } = useActivity(id)

  if (error) return <Alert>{error}</Alert>
  if (!a) return <p role="status">불러오는 중…</p>

  const likeButton = (
    <button
      type="button"
      className={styles.like}
      aria-pressed={a.liked}
      onClick={toggleLike}
      disabled={pending}
    >
      <Heart aria-hidden="true" fill={a.liked ? 'currentColor' : 'none'} />
      <span className={styles.likeText}>{a.liked ? '관심 있음' : '관심'}</span>
    </button>
  )

  return (
    <article className={styles.page}>
      {header(likeButton)}
      <ActivityThumb kind={a.image_kind} size="hero" />

      <div>
        <p className={styles.category}>{a.category_label}</p>
        <h1 className={styles.title}>{a.title}</h1>
        {a.subtitle && <p className={styles.subtitle}>{a.subtitle}</p>}
      </div>

      <dl className={styles.info}>
        <Row icon={<CalendarDays aria-hidden="true" />} label="일시">
          {formatDate(a.starts_at)}
          <br />
          {formatTime(a.starts_at)} ~ {formatTime(a.ends_at)}
        </Row>
        <Row icon={<MapPin aria-hidden="true" />} label="장소">
          {a.place}
        </Row>
        <Row icon={<Users aria-hidden="true" />} label="참여 인원">
          {a.applied_count}명 (선착순 {a.capacity}명)
        </Row>
        {a.description && (
          <Row icon={<FileText aria-hidden="true" />} label="활동 소개">
            {a.description}
          </Row>
        )}
      </dl>

      {actionError && <Alert>{actionError}</Alert>}

      <div className={styles.cta}>
        {a.applied ? (
          <div className={styles.applied}>
            <p className={styles.appliedText} role="status">
              ✓ 신청했어요. 그날 만나요!
            </p>
            <Button variant="secondary" block onClick={cancel} disabled={pending}>
              신청 취소하기
            </Button>
          </div>
        ) : a.is_full ? (
          <Button block large disabled>
            자리가 다 찼어요
          </Button>
        ) : (
          <Button block large onClick={apply} disabled={pending}>
            {pending ? '신청하는 중…' : '신청하기 →'}
          </Button>
        )}
      </div>
    </article>
  )
}
