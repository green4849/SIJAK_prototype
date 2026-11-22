import type { ReactNode } from 'react'
import { IS_DEMO } from '@/shared/lib/demo'
import styles from './DemoNote.module.css'

/** 시연 빌드에서만 보이는 한 줄 — 이 화면의 무엇이 진짜가 아닌지 밝힌다 */
export function DemoNote({ children }: { children: ReactNode }) {
  if (!IS_DEMO) return null
  return <p className={styles.note}>{children}</p>
}
