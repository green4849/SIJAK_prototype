import { ChevronRight, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import styles from './ActionCard.module.css'

/** 작은 아이콘 배경 색 — 큰 면에는 쓰지 않는다 (디자인 리뷰 공통 10) */
export type CardAccent = 'pink' | 'mint' | 'yellow' | 'sky' | 'beige'

/**
 * 강조 단계 (디자인 리뷰 ②-2)
 *  - primary: 권장 행동 하나 (녹색 면)
 *  - default: 일반 메뉴·선택지 (흰 카드 + 약한 그림자)
 *  - subtle : 더 낮은 강조 (면·그림자 없음)
 * 누를 수 없는 정보 카드(to·onClick 없음)는 단계와 관계없이 평평하게 그려진다.
 */
export type CardVariant = 'primary' | 'default' | 'subtle'

interface Props {
  icon: LucideIcon
  title: string
  description?: string
  variant?: CardVariant
  accent?: CardAccent
  /** 있으면 링크, 없으면 정보 카드 */
  to?: string
  onClick?: () => void
  disabled?: boolean
  /** 제목 옆 알림 배지 (shared/ui/Badge) */
  badge?: ReactNode
}

/**
 * 아이콘 + 제목 + 설명 카드 (홈 메뉴, 로그인 방법, 보안 안내).
 * 카드 전체가 하나의 터치 영역 — 작은 화살표만 누르게 하지 않는다.
 * 모든 카드가 같은 구조: [아이콘 칸] [제목·설명 왼쪽 정렬] [꺾쇠]
 */
export function ActionCard({
  icon: Icon,
  title,
  description,
  variant = 'default',
  accent = 'beige',
  to,
  onClick,
  disabled,
  badge,
}: Props) {
  const interactive = Boolean(to || onClick)
  const body = (
    <>
      <span className={styles.icon} data-accent={accent} aria-hidden="true">
        <Icon size={26} strokeWidth={2} />
      </span>
      <span className={styles.text}>
        <span className={styles.title}>
          {title}
          {badge}
        </span>
        {description && <span className={styles.desc}>{description}</span>}
      </span>
      {interactive && <ChevronRight className={styles.chevron} aria-hidden="true" size={22} />}
    </>
  )

  const attrs = { className: styles.card, 'data-variant': variant, 'data-interactive': interactive }
  if (to && !disabled)
    return (
      <Link to={to} {...attrs}>
        {body}
      </Link>
    )
  if (onClick)
    return (
      <button type="button" {...attrs} onClick={onClick} disabled={disabled}>
        {body}
      </button>
    )
  return <div {...attrs}>{body}</div>
}
