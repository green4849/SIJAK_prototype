import { MapPin, MessageCircleMore, Users } from 'lucide-react'
import { useAuth } from '@/features/auth'
import { ActionCard } from '@/shared/ui/ActionCard'
import { Avatar } from '@/shared/ui/Avatar'
import styles from './HomePage.module.css'

/** ③ 홈 — 큰 카드 세 개로 핵심 기능에 바로 (3-tap rule) */
export function HomePage() {
  const { user } = useAuth()
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
        <Avatar name={user.name} seed={user.id} size="lg" />
      </header>

      <nav aria-label="바로 가기" className={styles.cards}>
        <ActionCard
          tone="pink"
          icon={Users}
          title="친구 찾기"
          description="같은 동네 좋은 이웃을 만나보세요"
          to="/friends"
        />
        <ActionCard
          tone="mint"
          icon={MessageCircleMore}
          title="대화하기"
          description="새로운 이웃과 이야기를 나눠요"
          to="/chats"
        />
        <ActionCard
          tone="yellow"
          icon={MapPin}
          title="지역생활"
          description="우리 동네 다양한 활동을 함께해요"
          to="/activities"
        />
      </nav>
    </section>
  )
}
