import { useState } from 'react'
import { LocationConsent, useAuth } from '@/features/auth'
import { FriendFinder, ReceivedRequests, type FriendTab } from '@/features/friend'
import { SegmentTabs } from '@/shared/ui/SegmentTabs'
import { TopBar } from '@/shared/ui/TopBar'
import { chatWith } from './routes'
import styles from './TabPage.module.css'

const TABS: { value: FriendTab; label: string }[] = [
  { value: 'recommended', label: '추천 친구' },
  { value: 'nearby', label: '같은 동네' },
]

/** ④ 동네 친구 찾기 */
export function FriendsPage() {
  const { user } = useAuth()
  const [tab, setTab] = useState<FriendTab>('recommended')
  // 받은 신청을 수락하면 목록을 새로 불러온다
  const [version, setVersion] = useState(0)

  return (
    <section className={styles.page}>
      <TopBar title="동네 친구 찾기" back={false} />
      <p className={styles.lead}>우리 동네의 좋은 이웃을 만나보세요.</p>

      <ReceivedRequests onChanged={() => setVersion((v) => v + 1)} />

      <SegmentTabs label="친구 찾는 방법" tabs={TABS} value={tab} onChange={setTab} />

      <FriendFinder
        key={`${tab}-${version}-${user?.has_location}`}
        tab={tab}
        chatHref={chatWith}
        header={tab === 'nearby' && user && !user.has_location ? <LocationConsent /> : undefined}
      />
    </section>
  )
}
