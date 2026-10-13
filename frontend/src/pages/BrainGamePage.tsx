import { useParams } from 'react-router-dom'
import { CalcGame, MatchGame } from '@/features/brain'
import { TopBar } from '@/shared/ui/TopBar'
import { NotFoundPage } from './NotFoundPage'
import styles from './TabPage.module.css'

/** 두뇌 운동 → 게임 하나 */
export function BrainGamePage() {
  const { game } = useParams()
  if (game !== 'match' && game !== 'calc') return <NotFoundPage />
  return (
    <section className={styles.page}>
      <TopBar title={game === 'match' ? '짝 맞추기' : '셈하기'} backTo="/brain" />
      {game === 'match' ? <MatchGame doneHref="/brain" /> : <CalcGame doneHref="/brain" />}
    </section>
  )
}
