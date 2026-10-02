import { MapPin } from 'lucide-react'
import type { ReactNode } from 'react'
import { Avatar } from '@/shared/ui/Avatar'
import type { FriendCardData } from '../api/friendApi'
import styles from './FriendCard.module.css'

interface Props {
  card: FriendCardData
  /** 카드 아래 버튼 영역 (상황마다 다름) */
  actions?: ReactNode
}

function where(card: FriendCardData) {
  if (card.distance_km == null) return card.region_name
  return card.distance_km < 1 ? '1km 이내' : `약 ${card.distance_km.toFixed(1)}km`
}

/** ④ 친구 카드 — 이름·나이·소개·겹치는 관심사 */
export function FriendCard({ card, actions }: Props) {
  return (
    <article className={styles.card} aria-label={`${card.name}님`}>
      <div className={styles.top}>
        <Avatar name={card.name} seed={card.user_id} />
        <div className={styles.info}>
          <h3 className={styles.name}>
            {card.name}님 <span className={styles.age}>{card.age}세</span>
          </h3>
          <p className={styles.where}>
            <MapPin aria-hidden="true" size="1em" /> {where(card)}
          </p>
        </div>
      </div>

      {card.intro && <p className={styles.intro}>{card.intro}</p>}

      {card.common_interests.length > 0 && (
        <p className={styles.common}>
          <span className={styles.commonLabel}>같이 좋아해요</span>
          {card.common_interests.map((i) => (
            <span key={i} className={styles.chip}>
              {i}
            </span>
          ))}
        </p>
      )}

      {actions && <div className={styles.actions}>{actions}</div>}
    </article>
  )
}
