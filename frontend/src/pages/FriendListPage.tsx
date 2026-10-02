import { MyFriendList } from '@/features/friend'
import { TopBar } from '@/shared/ui/TopBar'
import { chatWith } from './routes'

/** ⑨ → 내 친구 목록 */
export function FriendListPage() {
  return (
    <>
      <TopBar title="내 친구 목록" backTo="/me" />
      <MyFriendList chatHref={chatWith} />
    </>
  )
}
