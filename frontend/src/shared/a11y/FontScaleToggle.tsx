import { useA11yPrefs } from './useA11yPrefs'
import styles from './FontScaleToggle.module.css'

/** 이 버튼을 켰을 때 쓰는 글자 크기 단계 (설정의 '더 크게') */
const ON_SCALE = 3

/**
 * 가입 전에도 바로 글씨를 키울 수 있는 '가가' 버튼 (A22).
 * 따로 상태를 두지 않고 화면 설정의 글자 크기를 켜고 끈다 → 설정 화면과 항상 같은 값.
 * 보통보다 큰 단계면 켜진 상태, 누르면 보통으로 돌아간다.
 */
export function FontScaleToggle({ className }: { className?: string }) {
  const { prefs, update } = useA11yPrefs()
  const on = prefs.fontScale > 1

  return (
    <button
      type="button"
      className={[styles.toggle, className].filter(Boolean).join(' ')}
      aria-pressed={on}
      aria-label="글씨 크게"
      onClick={() => update({ fontScale: on ? 1 : ON_SCALE })}
    >
      <span className={styles.small} aria-hidden="true">가</span>
      <span className={styles.big} aria-hidden="true">가</span>
    </button>
  )
}
