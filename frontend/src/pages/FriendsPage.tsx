import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LocationConsent, useAuth } from '@/features/auth'
import {
  FriendFinder,
  ReceivedRequests,
  SurveyPrompt,
  surveyPostponed,
  useSurveyGate,
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
import { TopBar } from '@/shared/ui/TopBar'
import { chatWith, friendSurvey } from './routes'
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
  // 포인트 (C12): 신청 버튼의 가격, 평가 안내, 모자랄 때 안내 창 — friend·points 를 여기서 조합
  const points = usePointSummary()
  const [shortOfPoints, setShortOfPoints] = useState(false)

  // 성향조사를 안 했으면 처음 들어올 때 시작 화면으로 ('다음에 하기'를 누른 뒤로는 탭 위 카드로만 권한다)
  const navigate = useNavigate()
  const needsSurvey = useSurveyGate()
  useEffect(() => {
    if (needsSurvey && !surveyPostponed()) navigate(friendSurvey, { replace: true })
  }, [needsSurvey, navigate])

  return (
    <section className={styles.page}>
      <TopBar title="동네 친구 찾기" back={false} />

      <ReceivedRequests onChanged={() => setVersion((v) => v + 1)} chatHref={chatWith} />

      <SegmentTabs label="친구 찾는 방법" tabs={TABS} value={tab} onChange={setTab} />

      <FriendFinder
        key={`${tab}-${version}-${user?.has_location}`}
        tab={tab}
        chatHref={chatWith}
        header={
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
