import { CreditCard, Gift, Sprout } from 'lucide-react'
import { ActionCard } from '@/shared/ui/ActionCard'
import { CoupleScene } from '@/shared/ui/illustrations/Scenes'
import { Sheet } from '@/shared/ui/Sheet'
import { usePointSummary } from '../hooks/usePoints'
import styles from './Points.module.css'

interface Props {
  open: boolean
  onClose: () => void
  /** 무료로 모으는 방법 화면 (내 포인트) */
  earnHref: string
}

/**
 * 친구 신청에 포인트가 모자랄 때. 결제를 먼저 내밀지 않고 '무료로 모으기'를 맨 위에.
 * 충전·구독은 아직 없어 누를 수 없는 '곧 열려요' 카드로만 (결제 연동은 docs/deferred.md §6).
 * 예전에는 눌러지는데 '준비 중' 알림만 떠서 고장 난 버튼처럼 보였다.
 */
export function InsufficientPointsSheet({ open, onClose, earnHref }: Props) {
  const s = usePointSummary()
  const need = s?.friend_request_cost ?? 0

  return (
    <Sheet open={open} title="포인트가 조금 부족해요" onClose={onClose}>
      <CoupleScene size="small" hearts={false} />
      {s && (
        <dl className={styles.compare}>
          <div>
            <dt>친구 신청</dt>
            <dd>{need.toLocaleString()}P 필요</dd>
          </div>
          <div>
            <dt>지금 가진 포인트</dt>
            <dd className={styles.short}>{s.balance.toLocaleString()}P</dd>
          </div>
        </dl>
      )}
      <div className={styles.options}>
        <ActionCard
          variant="primary"
          icon={Sprout}
          title="무료로 모으기"
          to={earnHref}
        />
        <ActionCard
          icon={Gift}
          accent="yellow"
          title="구독하고 매달 받기"
          description="곧 열려요"
        />
        <ActionCard
          icon={CreditCard}
          accent="sky"
          title="포인트 한 번 충전하기"
          description="곧 열려요"
        />
      </div>
    </Sheet>
  )
}
