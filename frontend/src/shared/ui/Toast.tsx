import { CircleAlert, CircleCheck, Info } from 'lucide-react'
import { type CSSProperties, useLayoutEffect, useState, useSyncExternalStore } from 'react'
import { currentToast, dismissToast, subscribeToast } from '@/shared/lib/toast'
import styles from './Toast.module.css'
import { ICON, ICON_STROKE } from './icon'

const ICONS = { success: CircleCheck, info: Info, error: CircleAlert }

/**
 * 화면 아래에 고정된 막대들 중 가장 높이 올라온 지점까지의 거리.
 * 고정 막대는 `data-bottom-bar` 속성으로 표시한다 (하단 탭, 대화 입력줄, 활동 신청 버튼 등).
 */
function bottomBarsHeight(): number {
  let top = window.innerHeight
  for (const el of document.querySelectorAll('[data-bottom-bar]')) {
    const r = el.getBoundingClientRect()
    if (r.height > 0) top = Math.min(top, r.top)
  }
  return Math.max(0, window.innerHeight - top)
}

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
