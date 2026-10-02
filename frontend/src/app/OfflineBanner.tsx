import { WifiOff } from 'lucide-react'
import { useOnline } from '@/shared/lib/useOnline'
import styles from './OfflineBanner.module.css'

/** 인터넷이 끊기면 화면 맨 위에 알림 — 다시 연결되면 저절로 사라진다 */
export function OfflineBanner() {
  const online = useOnline()
  if (online) return null
  return (
    <div className={styles.banner} role="status">
      <WifiOff aria-hidden="true" size="1.3em" />
      <span>인터넷이 끊겼어요. 다시 연결되면 저절로 이어져요.</span>
    </div>
  )
}
