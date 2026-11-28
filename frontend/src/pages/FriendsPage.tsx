import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { LocationConsent, useAuth } from '@/features/auth'
import {
  FriendFinder,
  ReceivedRequests,
  SurveyPrompt,
  type FriendTab,
} from '@/features/friend'
import {
  InsufficientPointsSheet,
  RatingRewardNote,
  friendRequestPrice,
  refreshPoints,
  usePointSummary,
} from '@/features/points'
import { SegmentTabs } from '@/shared/ui/SegmentTabs'
import { SearchField } from '@/shared/ui/SearchField'
import { TopBar } from '@/shared/ui/TopBar'
import { useDebouncedValue } from '@/shared/lib/useDebouncedValue'
import { assessment, chatWith, friendSurvey } from './routes'
import styles from './TabPage.module.css'

const TABS: { value: FriendTab; label: string }[] = [
  { value: 'recommended', label: '추천 친구' },
  { value: 'nearby', label: '같은 동네' },
]

/** ④ 동네 친구 찾기 */
export function FriendsPage() {
  const { user } = useAuth()
  const [tab, setTab] = useState<FriendTab>('recommended')
  const [search, setSearch] = useState('')
  const query = useDebouncedValue(search.trim())
  // 받은 신청을 수락하면 목록을 새로 불러온다
  const [version, setVersion] = useState(0)
  // 포인트 (C12): 신청 버튼의 가격, 평가 안내, 모자랄 때 안내 창 — friend·points 를 여기서 조합
  const points = usePointSummary()
  const [shortOfPoints, setShortOfPoints] = useState(false)
  const [params] = useSearchParams()
  const onboarding = params.get('welcome') === '1'

  // 성향조사는 저절로 넘기지 않는다 — 추천 위 카드(X로 닫기)·하단 '성향조사' 탭·마이페이지에서 고른다
  const navigate = useNavigate()

  return (
    <section className={styles.page}>
      <TopBar title="동네 친구 찾기" back={false} />

      <ReceivedRequests onChanged={() => setVersion((v) => v + 1)} chatHref={chatWith} />

      {!onboarding && <SegmentTabs label="친구 찾는 방법" tabs={TABS} value={tab} onChange={setTab} />}
      {!onboarding && <SearchField label="이웃 검색" placeholder="이름·소개·관심사" value={search} onChange={setSearch} />}

      <FriendFinder
        key={`${tab}-${version}-${user?.has_location}`}
        tab={tab}
        query={onboarding ? '' : query}
        onboarding={onboarding}
        onFinish={() => navigate(assessment('who5'), { state: { afterSignup: true } })}
        chatHref={chatWith}
        header={onboarding ? undefined :
          tab === 'nearby' && user && !user.has_location ? (
            <LocationConsent />
          ) : tab === 'recommended' ? (
            <>
              <SurveyPrompt to={friendSurvey} editTo={`${friendSurvey}?edit`} />
              <RatingRewardNote />
            </>
          ) : undefined
        }
        requestPrice={friendRequestPrice(points)}
        onPointsChanged={() => void refreshPoints()}
        onInsufficientPoints={() => setShortOfPoints(true)}
      />

      <InsufficientPointsSheet
        open={shortOfPoints}
        onClose={() => setShortOfPoints(false)}
        earnHref="/me/points"
      />
    </section>
  )
}
