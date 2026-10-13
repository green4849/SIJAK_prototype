import { Users } from 'lucide-react'
import { SosPanel } from '@/features/emergency'
import { IconAction } from '@/shared/ui/IconAction'
import { TopBar } from '@/shared/ui/TopBar'
import styles from './TabPage.module.css'

/** 홈 → 긴급 (C10): 도움 요청 버튼 + 바로 전화하기 (보고서 4.4.1 '긴급 도움 상단 고정') */
export function SosPage() {
  return (
    <section className={styles.page}>
      <TopBar title="긴급 도움" backTo="/" right={<IconAction icon={Users} label="보호자" to="/me/guardians" />} />
      <SosPanel guardiansHref="/me/guardians" />
    </section>
  )
}
