import { useState } from 'react'
import { WelfareList, type WelfareKind } from '@/features/welfare'
import { SegmentTabs } from '@/shared/ui/SegmentTabs'
import { TopBar } from '@/shared/ui/TopBar'
import { welfareDetail } from './routes'
import styles from './TabPage.module.css'

const TABS: { value: WelfareKind | 'all'; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'welfare_center', label: '복지관' },
  { value: 'kyungrodang', label: '경로당' },
  { value: 'senior_center', label: '시니어센터' },
]

/** ⑥ 지역생활 → 가까운 복지시설 (C7): 가까운 순, 종류별 */
export function WelfarePage() {
  const [kind, setKind] = useState<WelfareKind | 'all'>('all')
  return (
    <section className={styles.page}>
      <TopBar title="가까운 복지시설" backTo="/activities" />
      <SegmentTabs label="시설 종류" tabs={TABS} value={kind} onChange={setKind} />
      <WelfareList kind={kind} detailHref={welfareDetail} />
    </section>
  )
}
