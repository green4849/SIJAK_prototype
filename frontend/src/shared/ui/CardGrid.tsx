import type { ReactNode } from 'react'
import styles from './CardGrid.module.css'

interface Props {
  children: ReactNode
  /** 같은 줄 카드 높이를 맞출지 (기본: 내용대로) */
  stretch?: boolean
  /** 'section': 서로 다른 묶음(예: 메뉴 그룹) 사이처럼 넓게 */
  gap?: 'card' | 'section'
  /** 목록이면 'ul'(자식은 li) */
  as?: 'div' | 'ul' | 'nav'
  className?: string
  'aria-label'?: string
}

/** 카드 목록 배치 — 화면 폭·글자 크기에 맞춰 1~3열 (A17) */
export function CardGrid({ children, stretch, gap = 'card', as: Tag = 'div', className, ...rest }: Props) {
  return (
    <Tag className={className ? `${styles.grid} ${className}` : styles.grid} data-stretch={stretch} data-gap={gap} {...rest}>
      {children}
    </Tag>
  )
}
