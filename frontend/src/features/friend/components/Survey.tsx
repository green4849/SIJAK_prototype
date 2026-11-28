import { Sparkles, SlidersHorizontal, X } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { ActionCard } from '@/shared/ui/ActionCard'
import { Alert } from '@/shared/ui/Alert'
import { ICON, ICON_STROKE } from '@/shared/ui/icon'
import { Button, ButtonLink } from '@/shared/ui/Button'
import { InterestScene } from '@/shared/ui/illustrations/InterestScenes'
import { OptionGrid } from '@/shared/ui/OptionGrid'
import { PhotoChoiceGrid } from '@/shared/ui/PhotoChoiceGrid'
import { postponeSurvey, surveyPostponed, useSurveyForm, useSurveyStatus } from '../hooks/useSurvey'
import styles from './Survey.module.css'

interface FlowProps {
  /** 처음(추천 친구 탭에서 넘어옴)이면 시작 화면부터, 고치러 왔으면 1번 질문부터 */
  startAt: 'intro' | 'questions'
  /** '다음에 하기'·'추천 친구 만나보기'가 갈 곳 */
  friendsHref: string
  /** 시작이 그림 — 시작 화면(손 흔들기) · 끝 화면 */
  art?: ReactNode
  /** 첫 가입에서 이어진 조사 — 이때는 마음 점검만 선택 사항이다. */
  onboarding?: boolean
}

/** 문항마다 한 줄에 몇 칸 — 짧은 말은 두 칸, 문장은 한 칸 */
const COLUMNS: Record<string, 1 | 2> = { places: 2, traits: 2 }

/**
 * 성향조사 (2026-11-24 질문지·디자인) — 시작 → 한 화면에 한 문항(8개) → 끝.
 * 시작이가 묻는 게 아니라 화면이 묻고, 시작이는 그림과 말풍선으로 곁에 있다.
 */
export function SurveyFlow({ startAt, friendsHref, art, onboarding = false }: FlowProps) {
  const [step, setStep] = useState<number | 'intro'>(startAt === 'intro' ? 'intro' : 0)
  const f = useSurveyForm()

  // 단계가 바뀌면 맨 위로 — 긴 보기 목록 아래에서 '다음'을 눌렀을 때 다음 질문이 보이게
  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [step, f.saved])

  if (f.loadError) return <Alert>{f.loadError}</Alert>
  if (!f.loaded) return <p role="status">불러오는 중…</p>

  // 방금 마쳤거나, 이미 해 둔 분이 하단 '성향조사' 탭으로 다시 들어왔을 때
  const alreadyDone = startAt === 'intro' && step === 'intro' && f.done
  if (f.saved || alreadyDone) {
    return (
      <div className={styles.flow}>
        {art}
        <h2 className={styles.title}>{f.saved ? '성향조사를 마쳤어요!' : '성향조사를 이미 마쳤어요'}</h2>
        <p className={styles.lead}>
          이제 공통 관심사와 생활 방식을 바탕으로 잘 맞을 만한 동네 친구를 추천해 드릴게요.
        </p>
        <ButtonLink to={friendsHref} block large>
          추천 친구 만나보기
        </ButtonLink>
        <Button
          variant="secondary"
          block
          onClick={() => {
            f.restart()
            setStep(0)
          }}
        >
          내 취향 수정하기
        </Button>
      </div>
    )
  }

  if (step === 'intro') {
    return (
      <div className={styles.flow}>
        <h2 className={styles.title}>나와 잘 맞는 동네 친구 찾기</h2>
        <div className={styles.speech}>
          {art}
          <p className={styles.bubble}>
            안녕하세요! 시작이에요. 좋아하는 활동과 편안한 만남에 대해 알려 주세요. 나와 잘 맞는 동네 친구를
            찾는 데 도움이 될 거예요!
          </p>
        </div>
        <p className={styles.note}>질문 8개예요. 답은 추천에만 쓰고, 이웃에게 그대로 보여 주지 않아요.</p>
        <Button block large onClick={() => setStep(0)}>
          시작하기
        </Button>
        {!onboarding && (
          <ButtonLink variant="secondary" to={friendsHref} replace block onClick={postponeSurvey}>
            다음에 하기
          </ButtonLink>
        )}
      </div>
    )
  }

  const q = f.questions[step]
  const last = step === f.questions.length - 1
  const value = f.valueOf(q)
  const selected = Array.isArray(value) ? value : value ? [value] : []
  const go = (to: number | 'intro') => {
    f.clearNote()
    setStep(to)
  }

  return (
    <div className={styles.flow}>
      <div className={styles.progress}>
        <p className={styles.progressText}>
          {step + 1} / {f.questions.length}
          <span className={styles.stepName}> · {q.step}</span>
        </p>
        <div className={styles.steps} aria-hidden="true">
          {f.questions.map((x, i) => (
            <span key={x.key} className={styles.step} data-done={i <= step} />
          ))}
        </div>
      </div>

      {q.key === 'interests' ? (
        <>
          <h2 className={styles.question}>{q.text}</h2>
          <PhotoChoiceGrid
            legend={q.text}
            legendHidden
            hint={q.hint}
            options={q.options.map((o) => ({ value: o.code, label: o.label, art: <InterestScene code={o.code} /> }))}
            selected={selected}
            onToggle={(code) => f.choose(q, code)}
          />
        </>
      ) : (
        <div className={styles.grid}>
          <OptionGrid
            legend={q.text}
            hint={q.hint}
            options={q.options.map((o) => ({ value: o.code, label: o.label }))}
            selected={selected}
            onToggle={(code) => f.choose(q, code)}
            columns={COLUMNS[q.key] ?? 1}
            multiple={q.max > 1}
          />
        </div>
      )}

      <div className={styles.actions}>
        {f.note && <Alert>{f.note}</Alert>}
        {f.error && <Alert>{f.error}</Alert>}
        <div className={styles.nav}>
          {step === 0 && startAt === 'questions' ? (
            <ButtonLink variant="secondary" to={friendsHref}>
              이전
            </ButtonLink>
          ) : (
            <Button variant="secondary" onClick={() => go(step === 0 ? 'intro' : step - 1)}>
              이전
            </Button>
          )}
          <Button
            disabled={!f.answered(q) || f.pending}
            onClick={() => (last ? void f.submit() : go(step + 1))}
          >
            {!f.answered(q) ? '골라 주세요' : last ? '다 했어요' : '다음'}
          </Button>
        </div>
      </div>
    </div>
  )
}

/**
 * 추천 친구 탭 위 — 안 했으면 성향조사를 권하는 카드, 했으면 고치러 가는 작은 카드.
 * 불러오기 전·실패하면 아무것도 그리지 않는다 (목록을 가리지 않게).
 */
export function SurveyPrompt({ to, editTo }: { to: string; editTo: string }) {
  const { data } = useSurveyStatus()
  // 'X'로 닫으면 이 기기에서는 다시 권하지 않는다 — 하고 싶으면 하단 '성향조사' 탭·마이페이지에서
  const [hidden, setHidden] = useState(surveyPostponed)
  if (!data) return null
  if (data.answers)
    return <ActionCard variant="subtle" icon={SlidersHorizontal} accent="mint" title="내 취향 수정하기" to={editTo} />
  if (hidden) return null
  return (
    <div className={styles.prompt}>
      <ActionCard
        icon={Sparkles}
        accent="yellow"
        title="나와 잘 맞는 친구 찾기"
        description="질문 8개에 답하면 더 잘 맞는 이웃을 추천해 드려요"
        to={to}
      />
      <button
        type="button"
        className={styles.promptClose}
        aria-label="성향조사 안내 닫기"
        onClick={() => {
          postponeSurvey()
          setHidden(true)
        }}
      >
        <X aria-hidden="true" size={ICON.sm} strokeWidth={ICON_STROKE} />
      </button>
    </div>
  )
}
