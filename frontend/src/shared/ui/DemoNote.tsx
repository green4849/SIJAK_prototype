import type { ReactNode } from 'react'
import { IS_DEMO } from '@/shared/lib/demo'
import styles from './DemoNote.module.css'

/**
 * 시연 빌드에서만 보이는 한 줄 — 이 화면의 무엇이 진짜가 아닌지 밝힌다.
 * always: 실제 서버에서도 보인다 (서버가 '예시 데이터'라고 알려 준 경우, 예: 복지시설 sample_note)
 */
export function DemoNote({ children, always = false }: { children: ReactNode; always?: boolean }) {
  if (!IS_DEMO && !always) return null
  return <p className={styles.note}>{children}</p>
}
