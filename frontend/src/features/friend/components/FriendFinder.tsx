import type { ReactNode } from 'react'
import { Alert } from '@/shared/ui/Alert'
import type { FriendTab } from '../api/friendApi'
import { useRecommendations } from '../hooks/useFriends'
import { FriendActionButton } from './FriendActionButton'
import { FriendCard } from './FriendCard'
import styles from './FriendList.module.css'
import { CardGrid } from '@/shared/ui/CardGrid'

interface Props {
  tab: FriendTab
  chatHref: (userId: string) => string
  /** 목록 위에 끼워 넣을 것 (예: 위치 동의 카드) */
  header?: ReactNode
}

/** ④ 추천 친구 / 같은 동네 목록 */
export function FriendFinder({ tab, chatHref, header }: Props) {
  const { data, loading, error, request, actionError } = useRecommendations(tab)

  return (
    <section className={styles.section} aria-busy={loading}>
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
              actions={<FriendActionButton card={card} onRequest={request} chatHref={chatHref} />}
            />
          ))}
        </CardGrid>
      )}
    </section>
  )
}
