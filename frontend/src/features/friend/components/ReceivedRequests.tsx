import { useState } from 'react'
import { Button } from '@/shared/ui/Button'
import { ConfirmSheet } from '@/shared/ui/ConfirmSheet'
import type { FriendCardData } from '../api/friendApi'
import { useReceivedRequests } from '../hooks/useFriends'
import { FriendCard } from './FriendCard'
import styles from './FriendList.module.css'
import { CardGrid } from '@/shared/ui/CardGrid'

/**
 * 나에게 온 친구 신청 — 없으면 아무것도 그리지 않는다.
 * 거절은 되돌릴 수 없어 한 번 묻는다 (예전 '다음에'는 이름과 달리 바로 거절이었다).
 * 아직 모르겠으면 그냥 두면 된다.
 */
export function ReceivedRequests({ onChanged }: { onChanged?: () => void }) {
  const { data, respond } = useReceivedRequests(onChanged)
  const [declining, setDeclining] = useState<FriendCardData | null>(null)
  if (!data || data.length === 0) return null

  return (
    <section className={styles.section} aria-labelledby="received-title">
      <h2 id="received-title" className={styles.heading}>
        나에게 온 친구 신청 <span className={styles.count}>{data.length}</span>
      </h2>
      <CardGrid stretch>
        {data.map((card) => (
          <FriendCard
            key={card.user_id}
            card={card}
            actions={
              <>
                <Button onClick={() => respond(card, true)}>수락하기</Button>
                <Button variant="secondary" onClick={() => setDeclining(card)}>
                  거절하기
                </Button>
              </>
            }
          />
        ))}
      </CardGrid>

      <ConfirmSheet
        open={declining !== null}
        title={`${declining?.name ?? ''}님의 신청을 거절할까요?`}
        confirmLabel="거절하기"
        danger
        onConfirm={() => {
          if (declining) void respond(declining, false)
          setDeclining(null)
        }}
        onClose={() => setDeclining(null)}
      >
        <p>거절하면 이 신청은 다시 볼 수 없어요. 아직 모르겠으면 그냥 두셔도 돼요.</p>
      </ConfirmSheet>
    </section>
  )
}
