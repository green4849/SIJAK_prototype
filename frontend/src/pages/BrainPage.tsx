import { BrainHub } from '@/features/brain'
import { TopBar } from '@/shared/ui/TopBar'
import { brainGame } from './routes'
import styles from './TabPage.module.css'

/** 홈 → 두뇌 운동 (보고서 3.1 인지 강화): 이번 주 한 날 + 게임 두 개 */
export function BrainPage() {
  return (
    <section className={styles.page}>
      <TopBar title="두뇌 운동" backTo="/" />
      <BrainHub gameHref={brainGame} />
    </section>
  )
}
