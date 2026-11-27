import { ChevronRight } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ButtonLink } from '@/shared/ui/Button'
import { ICON, ICON_STROKE } from '@/shared/ui/icon'
import { useWho5Status } from '../hooks/useWellbeing'
import { sproutChange, sproutShade, type SproutShade } from '../lib/sprout'
import styles from './MoodSprout.module.css'

/** 새싹 그림 (로고와 같은 모양) — 진하기는 data-shade 로 */
export function SproutArt({ shade, size = 72 }: { shade: SproutShade | 0; size?: number }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true" className={styles.art} data-shade={shade}>
      <path d="M32 58V30" className={styles.stem} strokeWidth="5" strokeLinecap="round" />
      <path d="M32 33c-2-11-11-18-22-17 0 11 9 19 22 17z" className={styles.leafLeft} />
      <path d="M32 31c1-12 10-20 23-20 1 12-9 21-23 20z" className={styles.leafRight} />
    </svg>
  )
}

/**
 * 마음 건강 맨 위 '마음 새싹' — WHO-5 점수가 높을수록 새싹이 진해진다. 글자는 점수·단계·지난번 비교 한 줄만.
 * 아직 살펴본 적이 없으면 빈 새싹과 살펴보기 버튼.
 */
export function MoodSproutCard({ startHref, historyHref }: { startHref: string; historyHref: string }) {
  const { data } = useWho5Status()
  if (!data) return null
  const last = data.last
  if (!last)
    return (
      <section className={styles.card} aria-labelledby="sprout-title">
        <SproutArt shade={0} />
        <div className={styles.body}>
          <h2 id="sprout-title" className={styles.title}>
            마음 새싹
          </h2>
          <p className={styles.sub}>마음을 살펴보면 새싹에 색이 들어요.</p>
          <ButtonLink to={startHref} block>
            마음 건강 살펴보기
          </ButtonLink>
        </div>
      </section>
    )
  const change = sproutChange(last.score, last.previous_score)
  return (
    <Link to={historyHref} className={styles.card} aria-labelledby="sprout-title">
      <SproutArt shade={sproutShade(last.score)} />
      <div className={styles.body}>
        <p className={styles.caption}>마음 새싹</p>
        <h2 id="sprout-title" className={styles.title}>
          {last.score}점 · {last.level_label}
        </h2>
        {change && (
          <p className={styles.change} data-dir={change.dir}>
            {change.text}
          </p>
        )}
      </div>
      <ChevronRight aria-hidden="true" className={styles.chevron} size={ICON.sm} strokeWidth={ICON_STROKE} />
    </Link>
  )
}

/**
 * 마이페이지 프로필 — 왼쪽에 새싹 진하기와 같은 색 띠, 아래 한 줄 '마음 새싹 68점 · 지난번보다 6점 ↑'.
 * 살펴본 적이 없거나(동의 안 함 포함) 불러오지 못하면 띠 없이 그대로.
 * 본인 화면에만 쓴다 — 마음 건강 점수는 민감정보라 다른 사람이 보는 곳에는 두지 않는다.
 */
export function MoodBand({ children, href }: { children: ReactNode; href: string }) {
  const { data } = useWho5Status()
  const last = data?.last
  if (!last) return <>{children}</>
  const change = sproutChange(last.score, last.previous_score)
  return (
    <div className={styles.band} data-shade={sproutShade(last.score)}>
      {children}
      <Link to={href} className={styles.bandLine}>
        <SproutArt shade={sproutShade(last.score)} size={24} />
        <span>
          마음 새싹 {last.score}점{change && ` · ${change.text}`}
        </span>
      </Link>
    </div>
  )
}
