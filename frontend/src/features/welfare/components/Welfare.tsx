import { Building2, ChevronRight, Clock, MapPin, Phone, Users } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Alert } from '@/shared/ui/Alert'
import { CardGrid } from '@/shared/ui/CardGrid'
import { ICON, ICON_STROKE } from '@/shared/ui/icon'
import type { WelfareCenter, WelfareKind } from '../api/welfareApi'
import { useCenter, useNearbyCenters } from '../hooks/useWelfare'
import styles from './Welfare.module.css'

const km = (n: number) => (n < 1 ? `${n * 1000}m` : `${n}km`)
const telOf = (phone: string) => `tel:${phone.replace(/\D/g, '')}`
const prettyPhone = (p: string) => {
  const d = p.replace(/\D/g, '')
  if (d.startsWith('02')) return d.replace(/^(02)(\d{3,4})(\d{4})$/, '$1-$2-$3')
  return d.replace(/^(\d{3})(\d{3,4})(\d{4})$/, '$1-$2-$3')
}

/** 가까운 복지시설 목록 — 가까운 순 */
export function WelfareList({ kind, detailHref }: { kind: WelfareKind | 'all'; detailHref: (id: string) => string }) {
  const { data, error, loading } = useNearbyCenters(kind)
  if (error) return <Alert>{error}</Alert>
  if (loading && !data) return <p role="status">불러오는 중…</p>
  if (!data?.length) return <p className={styles.empty}>가까운 곳에 이런 시설이 없어요.</p>
  return (
    <CardGrid as="ul">
      {data.map((c) => (
        <li key={c.id}>
          <Link to={detailHref(c.id)} className={styles.item}>
            <span className={styles.thumb} data-kind={c.kind} aria-hidden="true">
              <Building2 size={ICON.md} strokeWidth={ICON_STROKE} />
            </span>
            <span className={styles.main}>
              <span className={styles.title}>{c.name}</span>
              <span className={styles.meta}>
                {c.kind_label} · {km(c.distance_km)}
              </span>
              {c.programs.length > 0 && <span className={styles.meta}>프로그램 {c.programs.length}개</span>}
            </span>
            <ChevronRight aria-hidden="true" className={styles.chevron} size={ICON.sm} strokeWidth={ICON_STROKE} />
          </Link>
        </li>
      ))}
    </CardGrid>
  )
}

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

/** 복지시설 상세 — 기본 정보 · 프로그램 · 모임 공간 + 아래 고정 '전화로 신청하기' */
export function WelfareDetail({ id, header }: { id: string; header: ReactNode }) {
  const { data: c, error } = useCenter(id)
  if (error)
    return (
      <>
        {header}
        <Alert>{error}</Alert>
      </>
    )
  if (!c) return <p role="status">불러오는 중…</p>
  return <Detail c={c} header={header} />
}

function Detail({ c, header }: { c: WelfareCenter; header: ReactNode }) {
  return (
    <article className={styles.page}>
      {header}
      <div>
        <p className={styles.kind}>{c.kind_label}</p>
        <h1 className={styles.name}>{c.name}</h1>
      </div>

      <dl className={styles.info}>
        <Row icon={<MapPin aria-hidden="true" size={ICON.md} strokeWidth={ICON_STROKE} />} label="주소">
          {c.address} <span className={styles.muted}>· {km(c.distance_km)}</span>
        </Row>
        <Row icon={<Clock aria-hidden="true" size={ICON.md} strokeWidth={ICON_STROKE} />} label="여는 시간">
          {c.open_hours}
        </Row>
        <Row icon={<Phone aria-hidden="true" size={ICON.md} strokeWidth={ICON_STROKE} />} label="전화">
          {prettyPhone(c.phone)}
        </Row>
      </dl>

      {c.programs.length > 0 && (
        <section className={styles.section} aria-labelledby="programs-title">
          <h2 id="programs-title" className={styles.sectionTitle}>
            프로그램
          </h2>
          <ul className={styles.rows}>
            {c.programs.map((p) => (
              <li key={p.id} className={styles.program}>
                <span className={styles.programMain}>
                  <span className={styles.programTitle}>{p.title}</span>
                  <span className={styles.muted}>
                    {p.schedule_text} · {p.fee_text}
                  </span>
                </span>
                {p.seats_left !== null && (
                  <span className={styles.seats} data-full={p.seats_left === 0}>
                    {p.seats_left === 0 ? '마감' : `${p.seats_left}자리`}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {c.rooms.length > 0 && (
        <section className={styles.section} aria-labelledby="rooms-title">
          <h2 id="rooms-title" className={styles.sectionTitle}>
            모임 공간 빌리기
          </h2>
          <ul className={styles.rows}>
            {c.rooms.map((r) => (
              <li key={r.name} className={styles.program}>
                <span className={styles.programMain}>
                  <span className={styles.programTitle}>{r.name}</span>
                  <span className={styles.muted}>{r.available_text}</span>
                </span>
                <span className={styles.capacity}>
                  <Users aria-hidden="true" size={ICON.inline} strokeWidth={ICON_STROKE} /> {r.capacity}명
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className={styles.actionBar} data-bottom-bar>
        <a href={telOf(c.phone)} className={styles.call}>
          <Phone aria-hidden="true" size={ICON.md} strokeWidth={ICON_STROKE} />
          전화로 신청하기
        </a>
      </div>
    </article>
  )
}
