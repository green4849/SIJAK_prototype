import { TriangleAlert } from 'lucide-react'
import type { RiskWarningData } from '../api/safetyApi'
import styles from './RiskWarning.module.css'

interface Props {
  warning: RiskWarningData
  onReport: () => void
}

/**
 * 받은 메시지 아래 경고 — 무엇이 위험한지와 할 일을 짧게.
 * 메시지를 가리지는 않는다 (판단은 어르신이, 우리는 알려 줄 뿐).
 */
export function RiskWarning({ warning, onReport }: Props) {
  const strong = warning.level >= 2
  return (
    // alert가 아니라 note — 지난 경고까지 매번 읽히지 않게 (새 메시지는 목록의 aria-live가 알림)
    <div className={styles.box} data-strong={strong} role="note" aria-label="위험 경고">
      <p className={styles.title}>
        <TriangleAlert aria-hidden="true" size="1.2em" />
        {strong ? '잠깐만요! 조심하세요' : '한 번 더 생각해 보세요'}
      </p>
      <p className={styles.text}>
        {warning.reasons.join(', ')}이(가) 있어요.
        {strong && ' 돈을 보내거나 번호를 알려 주지 마세요.'}
      </p>
      <button type="button" className={styles.report} onClick={onReport}>
        신고하기
      </button>
    </div>
  )
}
