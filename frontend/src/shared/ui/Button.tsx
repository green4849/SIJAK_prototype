import type { ButtonHTMLAttributes } from 'react'
import styles from './Button.module.css'

type Variant = 'primary' | 'secondary' | 'danger'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  block?: boolean
}

/** 시니어용 기본 버튼 — 최소 56px 터치 영역, 큰 글씨 */
export function Button({ variant = 'primary', block = false, className, ...rest }: Props) {
  const cls = [styles.button, styles[variant], block && styles.block, className]
    .filter(Boolean)
    .join(' ')
  return <button type="button" className={cls} {...rest} />
}
