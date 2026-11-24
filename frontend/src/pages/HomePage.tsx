import { MapPin, MessageCircleMore, Siren, Sprout, Users } from 'lucide-react'
import { NextActivity } from '@/features/activity'
import { useAuth } from '@/features/auth'
import { BrainTodayCard } from '@/features/brain'
import { useUnreadTotal } from '@/features/chat'
import { useReceivedCount } from '@/features/friend'
import { MissionCards, PointChip } from '@/features/points'
import { Who5DueCard } from '@/features/wellbeing'
import { ActionCard } from '@/shared/ui/ActionCard'
import { IconAction } from '@/shared/ui/IconAction'
import { Badge } from '@/shared/ui/Badge'
import { NeighborsScene } from '@/shared/ui/illustrations/Scenes'
import styles from './HomePage.module.css'
import { activityDetail, assessment } from './routes'

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
            오늘도 좋은 하루 보내세요! <span aria-hidden="true">☀️</span>
          </p>
        </div>
        <div className={styles.side}>
          <PointChip to="/me/points" />
          {/* 긴급 도움은 홈 맨 위에 늘 (C10, 보고서 4.4.1). 내 얼굴은 마이페이지에 */}
          <IconAction icon={Siren} label="긴급" tone="danger" to="/sos" />
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

      {/* 마음 건강 살펴보기(WHO-5) — 처음이거나 4주가 지났을 때만 */}
      <Who5DueCard to={assessment('who5')} />

      {/* 신청한 활동 중 가장 가까운 것 — 활동에 나가도록 돕는 앱이라 홈에서 바로 */}
      <NextActivity detailHref={activityDetail} />

      {/* 첫 친구 3명 사귀기 (C12) — 받고 나면 홈에서는 사라진다 */}
      <MissionCards hideClaimed />

      {/* 인지 훈련 — 매일 조금씩 (연속 일수) */}
      <BrainTodayCard to="/brain" />
    </section>
  )
}
