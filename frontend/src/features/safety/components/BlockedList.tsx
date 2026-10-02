import { Alert } from '@/shared/ui/Alert'
import { Avatar } from '@/shared/ui/Avatar'
import { Button } from '@/shared/ui/Button'
import { useBlockedUsers } from '../hooks/useSafety'
import styles from './BlockedList.module.css'

/** ⑨ → 차단한 이웃 관리 */
export function BlockedList() {
  const { data, error, loading, unblock } = useBlockedUsers()

  if (error) return <Alert>{error}</Alert>
  if (loading && !data) return <p role="status">불러오는 중…</p>
  if (!data || data.length === 0) return <p className={styles.empty}>차단한 이웃이 없어요.</p>

  return (
    <ul className={styles.list}>
      {data.map((u) => (
        <li key={u.user_id} className={styles.item}>
          <Avatar name={u.name} seed={u.user_id} />
          <span className={styles.name}>{u.name}님</span>
          <Button variant="secondary" onClick={() => unblock(u.user_id)}>
            차단 풀기
          </Button>
        </li>
      ))}
    </ul>
  )
}
