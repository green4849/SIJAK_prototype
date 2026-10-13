import { Sprout } from 'lucide-react'
import { ICON_STROKE } from '@/shared/ui/icon'
import styles from './Companion.module.css'

/** 말동무 얼굴 — 사람 그림과 헷갈리지 않게 '새싹'(로고의 잎) 하나. 크기는 아바타 규칙과 같게 */
export function CompanionAvatar({ size = 'bubble' }: { size?: 'bubble' | 'header' }) {
  return (
    <span className={styles.avatar} data-size={size} aria-hidden="true">
      <Sprout size={size === 'header' ? 28 : 22} strokeWidth={ICON_STROKE} />
    </span>
  )
}
