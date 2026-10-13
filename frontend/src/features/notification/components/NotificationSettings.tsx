import { Moon } from 'lucide-react'
import { Alert } from '@/shared/ui/Alert'
import { ICON, ICON_STROKE } from '@/shared/ui/icon'
import type { TimeSlot } from '../api/notificationApi'
import { useNotificationPrefs } from '../hooks/useNotificationPrefs'
import styles from './NotificationSettings.module.css'

/**
 * 오늘의 추천 친구 알림 설정 (C12).
 * 회의 원안 '하루 3~4번' → 하루 2번까지, 받는 시간을 직접. 밤에는 보내지 않는다.
 */
export function NotificationSettings() {
  const { data: p, error, saving, saveError, save } = useNotificationPrefs()
  if (error) return <Alert>{error}</Alert>
  if (!p) return <p role="status">불러오는 중…</p>

  const on = p.recommend_enabled
  const full = p.recommend_times.length >= p.max_per_day

  function toggleTime(code: TimeSlot, label: string) {
    if (!p) return
    const has = p.recommend_times.includes(code)
    const next = has ? p.recommend_times.filter((t) => t !== code) : [...p.recommend_times, code]
    // 마지막 하나를 끄면 = 알림 끄기
    void save(next.length > 0, next, has ? `${label} 알림을 껐어요` : `${label}에 알려 드릴게요`)
  }

  return (
    <div className={styles.wrap}>
      <section className={styles.card} aria-labelledby="recommend-title">
        <div className={styles.head}>
          <div>
            <h2 id="recommend-title" className={styles.title}>
              오늘의 추천 친구 알림
            </h2>
            <p className={styles.desc}>새 동네 이웃이 추천되면 알려 드려요</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={on}
            aria-labelledby="recommend-title"
            className={styles.switch}
            disabled={saving}
            onClick={() =>
              void save(
                !on,
                !on && p.recommend_times.length === 0 ? ['morning'] : p.recommend_times,
                on ? '추천 알림을 껐어요' : '추천 알림을 켰어요',
              )
            }
          >
            <span className={styles.switchText}>{on ? '켜짐' : '꺼짐'}</span>
          </button>
        </div>

        {on && (
          <fieldset className={styles.times}>
            <legend className={styles.legend}>받는 시간 (하루 {p.max_per_day}번까지)</legend>
            {p.time_options.map((o) => {
              const picked = p.recommend_times.includes(o.code)
              return (
                <button
                  key={o.code}
                  type="button"
                  className={styles.time}
                  data-selected={picked}
                  aria-pressed={picked}
                  // 이미 두 개 골랐으면 새로 고를 수 없게 — 하나를 먼저 끄도록
                  disabled={saving || (!picked && full)}
                  onClick={() => toggleTime(o.code, o.label)}
                >
                  {picked && <span aria-hidden="true">✓ </span>}
                  {o.label}
                </button>
              )
            })}
            {full && <p className={styles.hint}>다른 시간을 고르려면 하나를 먼저 꺼 주세요</p>}
          </fieldset>
        )}
      </section>

      {saveError && <Alert>{saveError}</Alert>}

      <p className={styles.quiet}>
        <Moon aria-hidden="true" size={ICON.inline} strokeWidth={ICON_STROKE} />
        {p.quiet_hours}
      </p>
    </div>
  )
}
