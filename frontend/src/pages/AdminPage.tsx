import { useState } from 'react'
import { CaseQueue, WatchList } from '@/features/admin'
import { SegmentTabs } from '@/shared/ui/SegmentTabs'
import { TopBar } from '@/shared/ui/TopBar'
import styles from './TabPage.module.css'

type Tab = 'cases' | 'watch'
const TABS: { value: Tab; label: string }[] = [
  { value: 'cases', label: '신고·위험 대화' },
  { value: 'watch', label: '돌봄이 필요한 이웃' },
]

/**
 * B7 운영자·복지기관 화면 — 어르신 화면에는 들어가는 길이 없다 (주소로 직접, 시연 대본·README 참고).
 * 실서비스에서는 운영자 권한이 있는 계정만.
 */
export function AdminPage() {
  const [tab, setTab] = useState<Tab>('cases')
  return (
    <section className={styles.page}>
      <TopBar title="운영자 화면" backTo="/" />
      <SegmentTabs label="보기" tabs={TABS} value={tab} onChange={setTab} />
      {tab === 'cases' ? <CaseQueue /> : <WatchList />}
    </section>
  )
}
