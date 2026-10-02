import type { LucideIcon } from 'lucide-react'
import type { ButtonHTMLAttributes } from 'react'
import { Link } from 'react-router-dom'
import { ICON, ICON_STROKE } from './icon'
import styles from './IconAction.module.css'

interface Common {
  icon: LucideIcon
  /** 아이콘 아래 짧은 글자 — 아이콘만으로는 뜻을 모를 수 있다 */
  label: string
  /** 'danger': 빨강(주의) — 예: 관심(하트) */
  tone?: 'default' | 'danger'
  /** 채운 아이콘으로 선택 상태 표시 (위치·크기는 그대로) */
  filled?: boolean
}

type Props = Common &
  (
    | ({ to: string } & { onClick?: never })
    | ({ to?: undefined } & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'>)
  )

/**
 * 상단 바 오른쪽 등 '아이콘 + 짧은 글자' 동작 — 모든 화면에서 같은 크기·여백 (리뷰 공통 17).
 * 예: 설정, 더보기, 관심
 */
export function IconAction({ icon: Icon, label, tone = 'default', filled, ...rest }: Props) {
  const body = (
    <>
      <Icon aria-hidden="true" size={ICON.md} strokeWidth={ICON_STROKE} fill={filled ? 'currentColor' : 'none'} />
      <span className={styles.label}>{label}</span>
    </>
  )
  if ('to' in rest && rest.to)
    return (
      <Link to={rest.to} className={styles.action} data-tone={tone}>
        {body}
      </Link>
    )
  const buttonProps = rest as ButtonHTMLAttributes<HTMLButtonElement>
  return (
    <button type="button" {...buttonProps} className={styles.action} data-tone={tone}>
      {body}
    </button>
  )
}
