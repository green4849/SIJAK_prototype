import { CircleAlert, Lock, ShieldCheck, ShieldEllipsis } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { ActionCard } from '@/shared/ui/ActionCard'
import { ButtonLink } from '@/shared/ui/Button'
import { TopBar } from '@/shared/ui/TopBar'
import { CoupleScene } from '@/shared/ui/illustrations/Scenes'
import { assessment } from './routes'
import styles from './SafetyPage.module.css'

/**
 * ⑧ 보안 기능 안내 — 가입 직후 한 번 보여 주고, 마이페이지에서도 다시 볼 수 있다.
 * 문구는 실제 동작과 일치시킨다 (사람이 24시간 지켜보는 게 아니라 자동 감지).
 */
export function SafetyPage() {
  const afterSignup = (useLocation().state as { afterSignup?: boolean } | null)?.afterSignup

  return (
    <section className={styles.page}>
      <TopBar back={!afterSignup} backTo="/me" />
      <CoupleScene />
      <div>
        <h1 className={styles.title}>시작은 이렇게 지켜 드려요</h1>
      </div>

      <div className={styles.list}>
        <ActionCard
          accent="mint"
          icon={ShieldCheck}
          title="실명 인증"
          description="본인 확인한 분만 이용해요"
        />
        <ActionCard
          accent="yellow"
          icon={ShieldEllipsis}
          title="위험한 대화 자동 감지"
          description="돈·비밀번호 이야기가 나오면 바로 경고해 드려요"
        />
        <ActionCard
          accent="pink"
          icon={CircleAlert}
          title="신고·차단"
          description="불편하면 바로 막을 수 있어요"
        />
        <ActionCard
          accent="sky"
          icon={Lock}
          title="개인정보 보호"
          description="전화번호는 남에게 안 보여요"
        />
      </div>

      {afterSignup && (
        // 다음: 첫 마음 건강 살펴보기 (WHO-5, 가입할 때 처음 — 건너뛸 수 있음)
        <ButtonLink to={assessment('who5')} state={{ afterSignup: true }} replace block large className={styles.cta}>
          알겠어요, 시작할게요
        </ButtonLink>
      )}
    </section>
  )
}
