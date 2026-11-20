import { CircleAlert, CircleCheck, Info } from 'lucide-react'
import { type CSSProperties, useLayoutEffect, useState, useSyncExternalStore } from 'react'
import { bottomBarsHeight } from '@/shared/lib/bottomBars'
import { currentToast, dismissToast, subscribeToast } from '@/shared/lib/toast'
import styles from './Toast.module.css'
import { ICON, ICON_STROKE } from './icon'

const ICONS = { success: CircleCheck, info: Info, error: CircleAlert }

/** 토스트 표시 영역 — 앱에 한 번만 둔다 (app/App.tsx). 띄우기는 shared/lib/toast 의 toast() */
export function ToastHost() {
  const item = useSyncExternalStore(subscribeToast, currentToast)
  const [offset, setOffset] = useState(0)
  const Icon = item ? ICONS[item.tone] : null

  // 떠 있는 동안 막대 크기가 바뀌어도(예: 신청 후 버튼 영역이 커짐) 따라 올라간다
  useLayoutEffect(() => {
    if (!item) return
    const measure = () => setOffset(bottomBarsHeight())
    measure()
    const ro = new ResizeObserver(measure)
    document.querySelectorAll('[data-bottom-bar]').forEach((el) => ro.observe(el))
    window.addEventListener('resize', measure)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [item])

  // 낭독 영역은 항상 존재해야 내용이 바뀔 때 읽힌다
  return (
    <div
      className={styles.host}
      role="status"
      aria-live="polite"
      style={{ '--toast-offset': `${offset}px` } as CSSProperties}
    >
      {item && Icon && (
        <button
          key={item.id}
          type="button"
          className={styles.toast}
          data-tone={item.tone}
          onClick={dismissToast}
          aria-label={`${item.message} (누르면 닫혀요)`}
        >
          <Icon aria-hidden="true" size={ICON.inline} strokeWidth={ICON_STROKE} />
          <span>{item.message}</span>
        </button>
      )}
    </div>
  )
}
