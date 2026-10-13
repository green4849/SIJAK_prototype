import { Button } from '@/shared/ui/Button'
import type { Mission } from '../api/pointsApi'
import { useMissions } from '../hooks/usePoints'
import styles from './Points.module.css'

interface Props {
  /** 받은 미션은 숨기기 (홈) / 보이기 (포인트 화면) */
  hideClaimed?: boolean
}

/** 첫 친구 3명 사귀기 — 진행 막대 + 다 하면 '포인트 받기' */
export function MissionCards({ hideClaimed = false }: Props) {
  const { data, claim, claiming } = useMissions()
  const items = (data ?? []).filter((m) => !(hideClaimed && m.claimed))
  if (items.length === 0) return null
  return (
    <>
      {items.map((m) => (
        <MissionCard key={m.code} mission={m} onClaim={() => claim(m)} claiming={claiming} />
      ))}
    </>
  )
}

function MissionCard({
  mission: m,
  onClaim,
  claiming,
}: {
  mission: Mission
  onClaim: () => void
  claiming: boolean
}) {
  return (
    <section className={styles.card} aria-label={`미션: ${m.title}`}>
      <div className={styles.cardHead}>
        <h2 className={styles.cardTitle}>{m.title}</h2>
        <span className={styles.reward}>+{m.reward.toLocaleString()}P</span>
      </div>
      <div
        className={styles.steps}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={m.goal}
        aria-valuenow={m.progress}
        aria-label={`${m.goal}명 중 ${m.progress}명`}
      >
        {Array.from({ length: m.goal }, (_, i) => (
          <span key={i} className={styles.step} data-done={i < m.progress} />
        ))}
      </div>
      {m.claimed ? (
        <p className={styles.progressText}>✓ 포인트를 받았어요</p>
      ) : m.done ? (
        <Button block onClick={onClaim} disabled={claiming}>
          {m.reward.toLocaleString()}P 받기
        </Button>
      ) : (
        <p className={styles.progressText}>
          {m.goal}명 중 {m.progress}명
        </p>
      )}
    </section>
  )
}
