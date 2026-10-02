import { Button } from '@/shared/ui/Button'
import { useReceivedRequests } from '../hooks/useFriends'
import { FriendCard } from './FriendCard'
import styles from './FriendList.module.css'

/** 나에게 온 친구 신청 — 없으면 아무것도 그리지 않는다 */
export function ReceivedRequests({ onChanged }: { onChanged?: () => void }) {
  const { data, respond } = useReceivedRequests(onChanged)
  if (!data || data.length === 0) return null

  return (
    <section className={styles.section} aria-labelledby="received-title">
      <h2 id="received-title" className={styles.heading}>
        나에게 온 친구 신청 <span className={styles.count}>{data.length}</span>
      </h2>
      {data.map((card) => (
        <FriendCard
          key={card.user_id}
          card={card}
          actions={
            <>
              <Button onClick={() => respond(card, true)}>수락하기</Button>
              <Button variant="secondary" onClick={() => respond(card, false)}>
                다음에
              </Button>
            </>
          }
        />
      ))}
    </section>
  )
}
