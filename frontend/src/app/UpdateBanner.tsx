import { RefreshCw } from 'lucide-react'
import { applyUpdate, useUpdateReady } from '@/shared/lib/pwa'
import { ICON, ICON_STROKE } from '@/shared/ui/icon'
import styles from './OfflineBanner.module.css'

/**
 * 새 배포가 받아지면 화면 맨 위에 알림 (H34). 저절로 바꾸지 않는다 — 쓰던 글이 사라지지 않게,
 * 누를 때만 새 화면으로 다시 읽는다.
 */
export function UpdateBanner() {
  const ready = useUpdateReady()
  if (!ready) return null
  return (
    <div className={styles.banner} role="status">
      <span>새 버전이 있어요.</span>
      <button type="button" className={styles.action} onClick={applyUpdate}>
        <RefreshCw aria-hidden="true" size={ICON.inline} strokeWidth={ICON_STROKE} />
        새로 고침
      </button>
    </div>
  )
}
