import type { ReactNode } from 'react'
import { Alert } from '@/shared/ui/Alert'
import type { FriendTab } from '../api/friendApi'
import { useRecommendations, type PointHooks } from '../hooks/useFriends'
import { FriendActionButton } from './FriendActionButton'
import { FriendCard } from './FriendCard'
import { RecommendRating } from './RecommendRating'
import styles from './FriendList.module.css'
import { CardGrid } from '@/shared/ui/CardGrid'

interface Props extends PointHooks {
  tab: FriendTab
  chatHref: (userId: string) => string
  /** 목록 위에 끼워 넣을 것 (예: 위치 동의 카드, 평가 포인트 안내) */
  header?: ReactNode
  /** 친구 신청 버튼에 붙일 포인트 ('무료' / '30P') — C12 */
  requestPrice?: string
}

/** ④ 추천 친구 / 같은 동네 목록. 추천 탭에서는 카드마다 3단계 평가 (C12) */
export function FriendFinder({ tab, chatHref, header, requestPrice, ...points }: Props) {
  const { data, loading, error, request, rate, actionError } = useRecommendations(tab, points)

  return (
    <section
      className={styles.section}
      aria-busy={loading}
      aria-label={tab === 'nearby' ? '같은 동네 이웃 목록' : '추천 친구 목록'}
    >
      {header}
      {error && <Alert>{error}</Alert>}
      {actionError && <Alert>{actionError}</Alert>}
      {loading && !data && <p role="status">이웃을 찾고 있어요…</p>}
      {data && data.length === 0 && (
        <p className={styles.empty}>
          {tab === 'nearby' ? '아직 가까운 이웃이 없어요.' : '추천할 이웃이 아직 없어요.'}
          <br />곧 새로운 이웃이 찾아올 거예요.
        </p>
      )}
      {data && data.length > 0 && (
        <CardGrid>
          {data.map((card) => (
            <FriendCard
              key={card.user_id}
              card={card}
              actions={
                <FriendActionButton
                  card={card}
                  onRequest={request}
                  chatHref={chatHref}
                  price={requestPrice}
                />
              }
              footer={tab === 'recommended' ? <RecommendRating card={card} onRate={rate} /> : undefined}
            />
          ))}
        </CardGrid>
      )}
    </section>
  )
}
