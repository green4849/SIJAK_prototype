import { useState, type ReactNode } from 'react'
import { Alert } from '@/shared/ui/Alert'
import { Button } from '@/shared/ui/Button'
import { Sheet } from '@/shared/ui/Sheet'
import type { FriendCardData, FriendTab } from '../api/friendApi'
import { useRecommendations, type PointHooks } from '../hooks/useFriends'
import { FriendActionButton } from './FriendActionButton'
import { FriendCard } from './FriendCard'
import { RecommendRating } from './RecommendRating'
import styles from './FriendList.module.css'
import { CardGrid } from '@/shared/ui/CardGrid'
import { CoupleScene } from '@/shared/ui/illustrations/Scenes'
import { SkeletonList } from '@/shared/ui/SkeletonList'

interface Props extends PointHooks {
  tab: FriendTab
  query?: string
  chatHref: (userId: string) => string
  /** 목록 위에 끼워 넣을 것 (예: 위치 동의 카드, 평가 포인트 안내) */
  header?: ReactNode
  /** 친구 신청 버튼에 붙일 포인트 ('무료' / '30P') — C12 */
  requestPrice?: string
  /** 가입 직후 추천 → 프로필 확인 → 선택 화면 */
  onboarding?: boolean
  onFinish?: () => void
}

/** ④ 추천 친구 / 같은 동네 목록. 추천 탭에서는 카드마다 3단계 평가 (C12) */
export function FriendFinder({ tab, query = '', chatHref, header, requestPrice, onboarding = false, onFinish, ...points }: Props) {
  const { data, loading, error, request, rate, actionError } = useRecommendations(tab, query, points)
  const [selected, setSelected] = useState<FriendCardData | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [sending, setSending] = useState(false)
  const costs = !!requestPrice && requestPrice !== '무료'

  async function sendSelected() {
    if (!selected || sending) return
    setSending(true)
    const sent = await request(selected.user_id)
    setSending(false)
    if (sent) {
      setSelected(null)
      onFinish?.()
    }
  }

  return (
    <section
      className={styles.section}
      aria-busy={loading}
      aria-label={tab === 'nearby' ? '같은 동네 이웃 목록' : '추천 친구 목록'}
    >
      {header}
      {error && <Alert>{error}</Alert>}
      {actionError && <Alert>{actionError}</Alert>}
      {loading && !data && <SkeletonList label="이웃을 찾고 있어요." />}
      {data && data.length === 0 && (
        <div>
          <CoupleScene size="small" />
          <p className={styles.empty}>
            {query ? '검색 결과가 없어요. 다른 이름이나 관심사를 입력해 보세요.' : tab === 'nearby' ? '아직 가까운 이웃이 없어요. ‘추천 친구’도 살펴보세요.' : '추천할 이웃이 아직 없어요. ‘같은 동네’도 살펴보세요.'}
          </p>
          {onboarding && <Button block onClick={onFinish}>다음으로</Button>}
        </div>
      )}
      {data && data.length > 0 && (
        <CardGrid stretch>
          {data.map((card) => (
            <FriendCard
              key={card.user_id}
              card={card}
              actions={onboarding ? (
                <Button block onClick={() => { setSelected(card); setConfirming(false) }}>프로필 보기</Button>
              ) : (
                <FriendActionButton
                  card={card}
                  onRequest={request}
                  chatHref={chatHref}
                  price={requestPrice}
                />
              )}
              footer={tab === 'recommended' && !onboarding ? <RecommendRating card={card} onRate={rate} /> : undefined}
            />
          ))}
        </CardGrid>
      )}
      {onboarding && selected && (
        <Sheet open title={`${selected.name}님과 친구가 되어 볼까요?`} onClose={() => setSelected(null)}>
          <p>프로필을 확인한 뒤 선택해 주세요.</p>
          <FriendCard card={selected} />
          {selected.interests.length > 0 && <p>좋아하는 것: {selected.interests.join(' · ')}</p>}
          {actionError && <Alert>{actionError}</Alert>}
          {confirming ? (
            <>
              <p>신청하면 {requestPrice} 빠져요. 상대가 받지 않아도 돌려받지 못해요.</p>
              <Button block large disabled={sending} onClick={() => void sendSelected()}>
                {sending ? '신청하는 중…' : '친구 신청하기'}
              </Button>
              <Button variant="secondary" block onClick={() => setConfirming(false)}>선택지로 돌아가기</Button>
            </>
          ) : (
            <>
              <Button block large disabled={sending || selected.relation === 'sent'} onClick={() => costs ? setConfirming(true) : void sendSelected()}>
                {selected.relation === 'sent' ? '이미 신청했어요' : sending ? '신청하는 중…' : '친구 신청하기'}
              </Button>
              <Button variant="secondary" block onClick={() => setSelected(null)}>다른 친구 보기</Button>
              <Button variant="secondary" block onClick={() => { setSelected(null); onFinish?.() }}>나중에 보기</Button>
            </>
          )}
        </Sheet>
      )}
    </section>
  )
}
