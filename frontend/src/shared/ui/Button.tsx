import type { ButtonHTMLAttributes } from 'react'
import { Link, type LinkProps } from 'react-router-dom'
import styles from './Button.module.css'

type Variant = 'primary' | 'secondary' | 'danger'

interface StyleProps {
  variant?: Variant
  block?: boolean
  /** 화면의 핵심 행동 1개에만 (시작하기, 신청하기 등) */
  large?: boolean
}

function cls({ variant = 'primary', block, large }: StyleProps, extra?: string) {
  return [styles.button, styles[variant], block && styles.block, large && styles.large, extra]
    .filter(Boolean)
    .join(' ')
}

type ButtonProps = StyleProps & ButtonHTMLAttributes<HTMLButtonElement>

/** 시니어용 기본 버튼 — 최소 56px 터치 영역, 큰 글씨 */
export function Button({ variant, block, large, className, ...rest }: ButtonProps) {
  return <button type="button" className={cls({ variant, block, large }, className)} {...rest} />
}

/** 버튼 모양의 링크 (페이지 이동은 button이 아니라 a로) */
export function ButtonLink({ variant, block, large, className, ...rest }: StyleProps & LinkProps) {
  return <Link className={cls({ variant, block, large }, className)} {...rest} />
}
