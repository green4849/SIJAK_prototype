import { ChevronRight, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import styles from './ActionCard.module.css'

export type CardTone = 'pink' | 'mint' | 'yellow' | 'sky' | 'beige' | 'primary'

interface Props {
  tone: CardTone
  icon: LucideIcon
  title: string
  description?: string
  /** 있으면 링크, 없으면 정보 카드 */
  to?: string
  onClick?: () => void
  disabled?: boolean
  /** 오른쪽 위 알림 배지 (shared/ui/Badge) */
  badge?: ReactNode
}

/**
 * 시안의 큰 색 카드 (홈 메뉴, 로그인 방법, 보안 안내).
 * 카드 전체가 하나의 터치 영역 — 작은 화살표만 누르게 하지 않는다.
 */
export function ActionCard({
  tone,
  icon: Icon,
  title,
  description,
  to,
  onClick,
  disabled,
  badge,
}: Props) {
  const body = (
    <>
      <span className={styles.icon} aria-hidden="true">
        <Icon size="1.6em" strokeWidth={2.2} />
      </span>
      <span className={styles.text}>
        <span className={styles.title}>
          {title}
          {badge}
        </span>
        {description && <span className={styles.desc}>{description}</span>}
      </span>
      {(to || onClick) && (
        <ChevronRight className={styles.chevron} aria-hidden="true" size="1.2em" />
      )}
    </>
  )

  const className = styles.card
  if (to && !disabled)
    return (
      <Link to={to} className={className} data-tone={tone}>
        {body}
      </Link>
    )
  if (onClick)
    return (
      <button type="button" className={className} data-tone={tone} onClick={onClick} disabled={disabled}>
        {body}
      </button>
    )
  return (
    <div className={className} data-tone={tone}>
      {body}
    </div>
  )
}
