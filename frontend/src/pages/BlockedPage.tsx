import { BlockedList } from '@/features/safety'
import { TopBar } from '@/shared/ui/TopBar'

/** ⑨ → 차단한 이웃 */
export function BlockedPage() {
  return (
    <>
      <TopBar title="차단한 이웃" backTo="/me" />
      <BlockedList />
    </>
  )
}
