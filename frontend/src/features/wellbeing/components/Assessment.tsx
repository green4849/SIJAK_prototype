import { ClipboardCheck, Phone } from 'lucide-react'
import { formatDate } from '@/shared/lib/datetime'
import { ActionCard } from '@/shared/ui/ActionCard'
import { Alert } from '@/shared/ui/Alert'
import { Button, ButtonLink } from '@/shared/ui/Button'
import { ICON, ICON_STROKE } from '@/shared/ui/icon'
import type { AssessmentKind } from '../api/wellbeingApi'
import { useAssessment, useAssessmentHistory } from '../hooks/useWellbeing'
import styles from './Wellbeing.module.css'

const KINDS: { kind: AssessmentKind; title: string; count: number }[] = [
  { kind: 'phq9', title: '기분 점검', count: 9 },
  { kind: 'gad7', title: '걱정 점검', count: 7 },
]

/** 자가평가 시작 카드 두 개 — 지난 결과를 설명 자리에 */
export function AssessmentCards({ hrefOf }: { hrefOf: (kind: AssessmentKind) => string }) {
  const { data } = useAssessmentHistory()
  return (
    <section className={styles.section} aria-labelledby="check-title">
      <h2 id="check-title" className={styles.sectionTitle}>
        마음 점검
      </h2>
      {KINDS.map(({ kind, title, count }) => {
        const last = data?.find((r) => r.kind === kind)
        return (
          <ActionCard
            key={kind}
            icon={ClipboardCheck}
            accent="mint"
            title={`${title} (${count}문항)`}
            description={last ? `지난번: ${last.level_label} · ${formatDate(last.created_at)}` : undefined}
            to={hrefOf(kind)}
          />
        )
      })}
    </section>
  )
}

interface FlowProps {
  kind: AssessmentKind
  /** 끝난 뒤 돌아갈 곳 */
  doneHref: string
}

/** 한 화면에 한 문항 — 큰 선택지 네 개, 고르면 바로 다음 */
export function AssessmentFlow({ kind, doneHref }: FlowProps) {
  const a = useAssessment(kind)
  if (a.loadError) return <Alert>{a.loadError}</Alert>
  if (!a.form) return <p role="status">불러오는 중…</p>

  if (a.result) {
    const r = a.result
    return (
      <div className={styles.flow}>
        <section className={styles.result} data-level={r.level} aria-labelledby="result-title">
          <p className={styles.weatherCaption}>{r.title} 결과</p>
          <h2 id="result-title" className={styles.resultLabel}>
            {r.level_label}
          </h2>
          <p className={styles.weatherScore}>
            점수 {r.score} / {r.max_score}
          </p>
        </section>
        <p className={styles.advice}>{r.advice}</p>
        {r.crisis && (
          <a href="tel:109" className={styles.call}>
            <Phone aria-hidden="true" size={ICON.md} strokeWidth={ICON_STROKE} />
            109 상담 전화하기
          </a>
        )}
        <p className={styles.note}>진단이 아니라 스스로 살펴보는 점검이에요.</p>
        <ButtonLink to={doneHref} block large>
          확인
        </ButtonLink>
      </div>
    )
  }

  const q = a.form.questions[a.step]
  return (
    <div className={styles.flow}>
      <div className={styles.progress}>
        <p className={styles.progressText}>
          {a.step + 1} / {a.total}
        </p>
        <div className={styles.steps} aria-hidden="true">
          {a.form.questions.map((x, i) => (
            <span key={x.id} className={styles.step} data-done={i <= a.step} />
          ))}
        </div>
      </div>
      <p className={styles.lead}>{a.form.lead}</p>
      <fieldset className={styles.question} disabled={a.pending}>
        <legend className={styles.questionText}>{q?.text}</legend>
        <div className={styles.options}>
          {a.form.options.map((o) => (
            <Button key={o.value} variant="secondary" block onClick={() => void a.answer(o.value)}>
              {o.label}
            </Button>
          ))}
        </div>
      </fieldset>
      {a.error && <Alert>{a.error}</Alert>}
      {a.step > 0 && (
        <Button variant="secondary" onClick={a.back}>
          이전 문항
        </Button>
      )}
    </div>
  )
}
