import { Coins } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ICON, ICON_STROKE } from '@/shared/ui/icon'
import { usePointSummary } from '../hooks/usePoints'
import styles from './Points.module.css'

/** 홈 인사 옆 잔액 — 누르면 내 포인트 화면 */
export function PointChip({ to }: { to: string }) {
  const summary = usePointSummary()
  if (!summary) return null
  const text = `${summary.balance.toLocaleString()}P`
  return (
    <Link to={to} className={styles.chip} aria-label={`내 포인트 ${text}`}>
      <Coins aria-hidden="true" size={ICON.inline} strokeWidth={ICON_STROKE} />
      {text}
    </Link>
  )
}
