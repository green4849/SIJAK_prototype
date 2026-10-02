import { useState } from 'react'
import { useAuth } from '@/features/auth'
import { ActivityList, useActivityList, type Category } from '@/features/activity'
import { SegmentTabs } from '@/shared/ui/SegmentTabs'
import { TopBar } from '@/shared/ui/TopBar'
import { activityDetail } from './routes'
import styles from './TabPage.module.css'

const TABS: { value: Category; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'culture', label: '문화·여가' },
  { value: 'health', label: '건강' },
  { value: 'learning', label: '배움' },
]

/** ⑥ 지역생활 */
export function ActivitiesPage() {
  const { user } = useAuth()
  const [category, setCategory] = useState<Category>('all')
  const { data, loading, error } = useActivityList(category)

  return (
    <section className={styles.page}>
      <TopBar title="지역생활" back={false} />
      <p className={styles.lead}>{user?.region_name}에서 함께하는 다양한 활동을 만나보세요.</p>
      <SegmentTabs label="활동 종류" tabs={TABS} value={category} onChange={setCategory} />
      <ActivityList
        items={data}
        loading={loading}
        error={error}
        detailHref={activityDetail}
        emptyText="이 종류의 활동이 아직 없어요."
      />
    </section>
  )
}
