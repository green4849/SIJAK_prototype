import { BellRing, Moon } from 'lucide-react'
import { Alert } from '@/shared/ui/Alert'
import { Button } from '@/shared/ui/Button'
import { ICON, ICON_STROKE } from '@/shared/ui/icon'
import { usePush, type PushState } from '../hooks/usePush'
import styles from './NotificationSettings.module.css'

/** 켜고 끌 수 없는 상태의 안내 — 소식은 알림함에 그대로 남는다고 함께 알려 드린다 */
const NOTICE: Partial<Record<PushState, string>> = {
  unsupported:
    '이 브라우저에서는 휴대폰 알림을 받을 수 없어요. 크롬이나 삼성 인터넷에서 열어 보세요. 새 소식은 알림함에서 볼 수 있어요.',
  'ios-install':
    "아이폰은 '홈 화면에 추가'한 시작 앱에서 알림을 받을 수 있어요. 아래 공유 버튼 → '홈 화면에 추가'를 누른 뒤, 그 앱에서 알림을 켜 주세요.",
  'server-off': '휴대폰 알림은 준비 중이에요. 그동안 새 소식은 알림함에서 볼 수 있어요.',
  denied:
    '알림을 허용하지 않으셨어요. 주소창 옆 자물쇠(또는 ⋮ → 설정) → 알림 → 허용으로 바꾼 뒤 이 화면을 다시 열어 주세요.',
}

/**
 * 설정 → 휴대폰 알림 (C4). 이 기기(브라우저)마다 켜고 끈다.
 * 새 메시지·친구 신청·위험 대화 소식을 앱을 닫아 둬도 알려 드린다. 메시지 내용은 알림에 보이지 않는다.
 */
export function PushSettings() {
  const { state, quietHours, busy, error, enable, disable, test } = usePush()
  const on = state === 'on'
  const canToggle = state === 'on' || state === 'off'
  const notice = NOTICE[state]

  return (
    <section className={styles.card} aria-labelledby="push-title">
      <div className={styles.head}>
        <h2 id="push-title" className={styles.title}>
          휴대폰 알림
        </h2>
        {canToggle && (
          <button
            type="button"
            role="switch"
            aria-checked={on}
            aria-labelledby="push-title"
            className={styles.switch}
            disabled={busy}
            onClick={() => void (on ? disable() : enable())}
          >
            <span className={styles.switchText}>{on ? '켜짐' : '꺼짐'}</span>
          </button>
        )}
      </div>

      {state === 'loading' && <p role="status">확인하는 중…</p>}
      {notice && <p>{notice}</p>}
      {canToggle && (
        <p>
          {on
            ? '이 기기로 새 메시지·친구 신청을 알려 드려요. 메시지 내용은 알림에 보이지 않아요.'
            : '앱을 닫아 둬도 새 메시지·친구 신청을 이 기기로 알려 드려요.'}
        </p>
      )}

      {on && (
        <Button variant="secondary" block disabled={busy} onClick={() => void test()}>
          <BellRing aria-hidden="true" size={ICON.inline} strokeWidth={ICON_STROKE} /> 시험 알림 보내기
        </Button>
      )}

      {error && <Alert>{error}</Alert>}

      {canToggle && quietHours && (
        <p className={styles.quiet}>
          <Moon aria-hidden="true" size={ICON.inline} strokeWidth={ICON_STROKE} />
          {quietHours}
        </p>
      )}
    </section>
  )
}
