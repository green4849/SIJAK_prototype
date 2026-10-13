import { Building2 } from 'lucide-react'
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ActivityList, useActivityList, type Category } from '@/features/activity'
import { ActionCard } from '@/shared/ui/ActionCard'
import { SegmentTabs } from '@/shared/ui/SegmentTabs'
import { TopBar } from '@/shared/ui/TopBar'
import { VolunteerBanner } from '@/shared/ui/illustrations/Scenes'
import { activityDetail } from './routes'
import styles from './TabPage.module.css'

const TABS: { value: Category; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'culture', label: '문화·여가' },
  { value: 'health', label: '건강' },
  { value: 'learning', label: '배움' },
  { value: 'volunteer', label: '봉사' },
]

/** ⑥ 지역생활 */
export function ActivitiesPage() {
  // ?category=volunteer 로 들어오면 그 분류부터 (내 포인트 → 봉사모임)
  const [params] = useSearchParams()
  const initial = TABS.find((t) => t.value === params.get('category'))?.value ?? 'all'
  const [category, setCategory] = useState<Category>(initial)
  const { data, loading, error } = useActivityList(category)

  return (
    <section className={styles.page}>
      <TopBar title="지역생활" back={false} />
      {/* C7 — 복지관·경로당 (보고서 O2O 연계) */}
      <ActionCard icon={Building2} accent="mint" title="가까운 복지관·경로당" to="/welfare" />
      <SegmentTabs label="활동 종류" tabs={TABS} value={category} onChange={setCategory} />
      {category === 'volunteer' && <VolunteerBanner />}
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
