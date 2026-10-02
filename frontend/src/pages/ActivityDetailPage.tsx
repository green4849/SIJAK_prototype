import { useParams } from 'react-router-dom'
import { ActivityDetail } from '@/features/activity'
import { TopBar } from '@/shared/ui/TopBar'

/** ⑦ 지역 활동 상세 */
export function ActivityDetailPage() {
  const { activityId = '' } = useParams()
  return (
    <ActivityDetail
      id={activityId}
      header={(likeButton) => <TopBar backTo="/activities" right={likeButton} />}
    />
  )
}
