import { CircleAlert, Lock, ShieldCheck, ShieldEllipsis } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { ActionCard } from '@/shared/ui/ActionCard'
import { ButtonLink } from '@/shared/ui/Button'
import { TopBar } from '@/shared/ui/TopBar'
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
      <div>
        <h1 className={styles.title}>안전한 시작을 약속합니다</h1>
        <p className={styles.lead}>안심하고 이용하세요.</p>
      </div>

      <div className={styles.list}>
        <ActionCard
          tone="mint"
          icon={ShieldCheck}
          title="실명 인증"
          description="본인 확인을 마친 분들만 이용해요."
        />
        <ActionCard
          tone="yellow"
          icon={ShieldEllipsis}
          title="위험한 대화 자동 감지"
          description="돈·계좌·비밀번호를 묻는 대화는 바로 알려 드려요."
        />
        <ActionCard
          tone="pink"
          icon={CircleAlert}
          title="신고 및 차단"
          description="불편한 분은 바로 신고하고 차단할 수 있어요."
        />
        <ActionCard
          tone="sky"
          icon={Lock}
          title="개인정보 보호"
          description="전화번호는 암호화해서 보관하고, 다른 분께 보이지 않아요."
        />
      </div>

      {afterSignup && (
        <ButtonLink to="/" replace block large className={styles.cta}>
          알겠어요, 시작할게요
        </ButtonLink>
      )}
    </section>
  )
}
