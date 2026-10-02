import { useState } from 'react'
import { api } from '@/shared/api/client'
import styles from './DemoBanner.module.css'

const KEY = 'wipi.demo.banner'

function remembered(): boolean {
  try {
    return sessionStorage.getItem(KEY) !== 'closed'
  } catch {
    return true
  }
}

function remember(open: boolean) {
  try {
    sessionStorage.setItem(KEY, open ? 'open' : 'closed')
  } catch {
    // 저장 못 해도 동작에는 지장 없음
  }
}

/**
 * 데모 안내 띠 — 접어 둘 수 있고, 바로 둘러보기·처음 상태로 버튼을 준다.
 * (인증 상태를 직접 건드리지 않고 데모 서버에 요청한 뒤 새로고침 → 앱이 세션을 복원)
 */
export function DemoBanner() {
  const [open, setOpenState] = useState(remembered)
  const [busy, setBusy] = useState(false)

  function setOpen(v: boolean) {
    remember(v)
    setOpenState(v)
  }

  async function run(path: string) {
    setBusy(true)
    // 둘러보기를 시작하면 화면을 가리지 않게 접어 둔다
    remember(path !== '/demo/login')
    await api.post(path, undefined, { skipAuthRetry: true }).catch(() => undefined)
    window.location.assign(import.meta.env.BASE_URL)
  }

  if (!open)
    return (
      <button type="button" className={styles.pill} onClick={() => setOpen(true)}>
        데모 화면이에요 · 안내 펼치기
      </button>
    )

  return (
    <aside className={styles.banner} aria-label="데모 안내">
      <p className={styles.text}>
        <strong>데모 화면이에요.</strong> 서버 없이 이 브라우저 안에서만 동작하고, 입력한 내용은 이 탭을
        닫으면 사라져요. 인증번호는 화면에 표시돼요.
      </p>
      <div className={styles.actions}>
        <button type="button" className={styles.primary} disabled={busy} onClick={() => run('/demo/login')}>
          김시작님으로 바로 둘러보기
        </button>
        <button type="button" className={styles.secondary} disabled={busy} onClick={() => run('/demo/reset')}>
          처음 상태로
        </button>
        <button type="button" className={styles.secondary} onClick={() => setOpen(false)}>
          접기
        </button>
      </div>
    </aside>
  )
}
