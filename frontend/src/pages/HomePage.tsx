import { MapPin, MessageCircleMore, Sprout, Users } from 'lucide-react'
import { useAuth } from '@/features/auth'
import { useUnreadTotal } from '@/features/chat'
import { useReceivedCount } from '@/features/friend'
import { MissionCards, PointChip } from '@/features/points'
import { ActionCard } from '@/shared/ui/ActionCard'
import { Avatar } from '@/shared/ui/Avatar'
import { Badge } from '@/shared/ui/Badge'
import { NeighborsScene } from '@/shared/ui/illustrations/Scenes'
import styles from './HomePage.module.css'

/** ③ 홈 — 큰 카드 네 개로 핵심 기능에 바로 (3-tap rule). 말동무는 C8 */
export function HomePage() {
  const { user } = useAuth()
  const unread = useUnreadTotal()
  const received = useReceivedCount()
  if (!user) return null

  return (
    <section className={styles.page}>
      <header className={styles.greeting}>
        <div>
          <h1 className={styles.name}>{user.name}님</h1>
          <p className={styles.hello}>
            좋은 하루 되세요! <span aria-hidden="true">☀️</span>
          </p>
        </div>
        <div className={styles.side}>
          <PointChip to="/me/points" />
          <Avatar name={user.name} seed={user.id} gender={user.gender} size="list" />
        </div>
      </header>

      <NeighborsScene />

      <nav aria-label="바로 가기" className={styles.cards}>
        <ActionCard
          accent="pink"
          icon={Users}
          title="친구 찾기"
          to="/friends"
          badge={<Badge count={received} label={(n) => `새 친구 신청 ${n}개`} />}
        />
        <ActionCard
          accent="mint"
          icon={MessageCircleMore}
          title="대화하기"
          to="/chats"
          badge={<Badge count={unread} label={(n) => `안 읽은 메시지 ${n}개`} />}
        />
        <ActionCard
          accent="yellow"
          icon={MapPin}
          title="지역생활"
          to="/activities"
        />
        <ActionCard accent="sky" icon={Sprout} title="말동무" to="/companion" />
      </nav>

      {/* 첫 친구 3명 사귀기 (C12) — 받고 나면 홈에서는 사라진다 */}
      <MissionCards hideClaimed />
    </section>
  )
}
