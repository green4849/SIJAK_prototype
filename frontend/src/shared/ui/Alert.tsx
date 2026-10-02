import type { ReactNode } from 'react'
import styles from './Alert.module.css'

interface Props {
  tone?: 'error' | 'info'
  children: ReactNode
}

/** 화면 낭독기가 바로 읽도록 role=alert/status */
export function Alert({ tone = 'error', children }: Props) {
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={styles.alert} data-tone={tone}>
      {children}
    </div>
  )
}
