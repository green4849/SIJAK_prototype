import { Navigate, useParams } from 'react-router-dom'
import { ActivityList, useMyActivities, type MineKind } from '@/features/activity'
import { TopBar } from '@/shared/ui/TopBar'
import { activityDetail } from './routes'

const TITLES: Record<MineKind, { title: string; empty: string }> = {
  applied: { title: '신청한 활동', empty: '아직 신청한 활동이 없어요. 지역생활에서 찾아보세요.' },
  liked: { title: '관심 있는 활동', empty: '하트를 누른 활동이 여기 모여요.' },
}

/** ⑨ → 신청한 활동 / 관심 있는 활동 */
export function MyActivitiesPage() {
  const { kind } = useParams()
  const valid = kind === 'applied' || kind === 'liked'
  const { data, loading, error } = useMyActivities(valid ? kind : 'applied')
  if (!valid) return <Navigate to="/me" replace />

  return (
    <>
      <TopBar title={TITLES[kind].title} backTo="/me" />
      <ActivityList
        items={data}
        loading={loading}
        error={error}
        detailHref={activityDetail}
        emptyText={TITLES[kind].empty}
      />
    </>
  )
}
