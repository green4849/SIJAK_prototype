import { CreditCard, Gift, Sprout } from 'lucide-react'
import { toast } from '@/shared/lib/toast'
import { ActionCard } from '@/shared/ui/ActionCard'
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
 * 충전·구독은 아직 화면 안내만 (결제 연동은 docs/deferred.md §6).
 */
export function InsufficientPointsSheet({ open, onClose, earnHref }: Props) {
  const s = usePointSummary()
  const need = s?.friend_request_cost ?? 0
  const notYet = () => toast('결제는 아직 준비 중이에요. 지금은 무료로 모아 주세요.', 'info')

  return (
    <Sheet open={open} title="포인트가 조금 부족해요" onClose={onClose}>
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
          onClick={notYet}
        />
        <ActionCard
          icon={CreditCard}
          accent="sky"
          title="포인트 한 번 충전하기"
          onClick={notYet}
        />
      </div>
    </Sheet>
  )
}
