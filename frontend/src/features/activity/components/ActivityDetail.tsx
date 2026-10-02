import { CalendarDays, FileText, Heart, MapPin, Users } from 'lucide-react'
import type { ReactNode } from 'react'
import { formatDate, formatTime } from '@/shared/lib/datetime'
import { Alert } from '@/shared/ui/Alert'
import { IconAction } from '@/shared/ui/IconAction'
import { Button } from '@/shared/ui/Button'
import { useActivity } from '../hooks/useActivities'
import { ActivityThumb } from './ActivityThumb'
import styles from './ActivityDetail.module.css'
import { ICON, ICON_STROKE } from '@/shared/ui/icon'

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

  // 선택 상태는 채운 하트 + aria-pressed 로. 글자는 그대로 두어 버튼 폭·위치가 바뀌지 않게 (리뷰 ⑦-11)
  const likeButton = (
    <IconAction
      icon={Heart}
      label="관심"
      tone="danger"
      filled={a.liked}
      aria-pressed={a.liked}
      onClick={toggleLike}
      disabled={pending}
    />
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
        <Row icon={<CalendarDays aria-hidden="true" size={ICON.md} strokeWidth={ICON_STROKE} />} label="일시">
          {formatDate(a.starts_at)}
          <br />
          {formatTime(a.starts_at)} ~ {formatTime(a.ends_at)}
        </Row>
        <Row icon={<MapPin aria-hidden="true" size={ICON.md} strokeWidth={ICON_STROKE} />} label="장소">
          {a.place}
        </Row>
        <Row icon={<Users aria-hidden="true" size={ICON.md} strokeWidth={ICON_STROKE} />} label="참여 인원">
          <strong className={styles.count}>{a.applied_count}명</strong> 신청{' '}
          <span className={styles.capacity}>· 정원 {a.capacity}명 (선착순)</span>
        </Row>
        {a.description && (
          <Row icon={<FileText aria-hidden="true" size={ICON.md} strokeWidth={ICON_STROKE} />} label="활동 소개">
            {a.description}
          </Row>
        )}
      </dl>

      {actionError && <Alert>{actionError}</Alert>}

      <div className={styles.cta} data-bottom-bar>
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
            {pending ? '신청하는 중…' : '신청하기'}
          </Button>
        )}
      </div>
    </article>
  )
}
