import { ButtonLink } from '@/shared/ui/Button'
import { Alert } from '@/shared/ui/Alert'
import { useMyFriends } from '../hooks/useFriends'
import { FriendCard } from './FriendCard'
import styles from './FriendList.module.css'

/** ⑨ → 내 친구 목록 */
export function MyFriendList({ chatHref }: { chatHref: (userId: string) => string }) {
  const { data, loading, error } = useMyFriends()

  return (
    <section className={styles.section} aria-busy={loading}>
      {error && <Alert>{error}</Alert>}
      {loading && !data && <p role="status">불러오는 중…</p>}
      {data && data.length === 0 && (
        <p className={styles.empty}>
          아직 친구가 없어요.
          <br />
          &lsquo;친구 찾기&rsquo;에서 이웃에게 먼저 인사해 보세요.
        </p>
      )}
      {data?.map((card) => (
        <FriendCard
          key={card.user_id}
          card={card}
          actions={
            <ButtonLink to={chatHref(card.user_id)} block>
              대화하기
            </ButtonLink>
          }
        />
      ))}
    </section>
  )
}
