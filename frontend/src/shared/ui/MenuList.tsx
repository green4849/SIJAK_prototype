import { ChevronRight, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import styles from './MenuList.module.css'
import { ICON, ICON_STROKE } from './icon'

export function MenuList({ children, label }: { children: ReactNode; label?: string }) {
  return (
    <ul className={styles.list} aria-label={label}>
      {children}
    </ul>
  )
}

interface ItemProps {
  icon: LucideIcon
  label: string
  /** 오른쪽 보조 정보 (예: 12명) */
  value?: string
  to?: string
  onClick?: () => void
  danger?: boolean
}

/** 마이페이지 등의 메뉴 한 줄 — 줄 전체가 터치 영역 */
export function MenuItem({ icon: Icon, label, value, to, onClick, danger }: ItemProps) {
  const body = (
    <>
      <Icon aria-hidden="true" size={ICON.md} strokeWidth={ICON_STROKE} className={styles.icon} />
      <span className={styles.label}>{label}</span>
      {value && <span className={styles.value}>{value}</span>}
      {!danger && (
        <ChevronRight aria-hidden="true" size={ICON.sm} strokeWidth={ICON_STROKE} className={styles.chevron} />
      )}
    </>
  )
  return (
    <li>
      {to ? (
        <Link to={to} className={styles.row} data-danger={danger}>
          {body}
        </Link>
      ) : (
        <button type="button" className={styles.row} data-danger={danger} onClick={onClick}>
          {body}
        </button>
      )}
    </li>
  )
}
