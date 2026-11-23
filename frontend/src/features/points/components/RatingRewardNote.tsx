import { Coins } from 'lucide-react'
import { ICON, ICON_STROKE } from '@/shared/ui/icon'
import { usePointSummary } from '../hooks/usePoints'
import styles from './Points.module.css'

/** 추천 친구 목록 위 한 줄 — 추천에 답하면 포인트, 오늘 남은 횟수 */
export function RatingRewardNote() {
  const s = usePointSummary()
  if (!s) return null
  return (
    <p className={styles.note}>
      <Coins aria-hidden="true" size={ICON.inline} strokeWidth={ICON_STROKE} />
      {s.ratings_left_today > 0
        ? `추천에 답하면 +${s.rating_reward}P · 오늘 ${s.ratings_left_today}번 더`
        : '오늘 받을 수 있는 포인트를 다 받았어요'}
    </p>
  )
}
