import { Building2 } from 'lucide-react'
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ActivityList, useActivityList, type Category } from '@/features/activity'
import { useAuth } from '@/features/auth'
import { ActionCard } from '@/shared/ui/ActionCard'
import { DemoNote } from '@/shared/ui/DemoNote'
import { SegmentTabs } from '@/shared/ui/SegmentTabs'
import { SearchField } from '@/shared/ui/SearchField'
import { TopBar } from '@/shared/ui/TopBar'
import { useDebouncedValue } from '@/shared/lib/useDebouncedValue'
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

/** 시연 시드의 활동 지역 (경기도 — 오산시 양산동) */
const OSAN_REGION = '41'

/** ⑥ 지역생활 */
export function ActivitiesPage() {
  // ?category=volunteer 로 들어오면 그 분류부터 (내 포인트 → 봉사 활동)
  const [params] = useSearchParams()
  const initial = TABS.find((t) => t.value === params.get('category'))?.value ?? 'all'
  const [category, setCategory] = useState<Category>(initial)
  const [search, setSearch] = useState('')
  const query = useDebouncedValue(search.trim())
  const { data, loading, error } = useActivityList(category, query)
  const { user } = useAuth()
  // 시연 활동은 오산시 양산동(경기도) 기준 — 다른 지역에서 가입하면 그 활동이 대신 보인다고 밝힌다
  const elsewhere = user && user.region_code !== OSAN_REGION

  return (
    <section className={styles.page}>
      <TopBar title="지역생활" back={false} />
      {elsewhere && <DemoNote>시연 활동은 오산시 양산동 기준이에요. 실제 앱에서는 사시는 동네의 활동이 나와요.</DemoNote>}
      {/* C7 — 복지관·경로당 (보고서 O2O 연계) */}
      <ActionCard icon={Building2} accent="mint" title="가까운 복지관·경로당" to="/welfare" />
      <SegmentTabs label="활동 종류" tabs={TABS} value={category} onChange={setCategory} />
      <SearchField label="활동 검색" placeholder="활동 이름·장소" value={search} onChange={setSearch} />
      {category === 'volunteer' && <VolunteerBanner />}
      <ActivityList
        items={data}
        loading={loading}
        error={error}
        detailHref={activityDetail}
        emptyText={query ? '검색 결과가 없어요. 다른 활동 이름이나 장소를 입력해 보세요.' : '이 종류의 활동이 아직 없어요. ‘전체’를 누르면 다른 활동도 보여요.'}
      />
    </section>
  )
}
