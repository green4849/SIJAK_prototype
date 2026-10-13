import { useState, type FormEvent } from 'react'
import { errorMessage } from '@/shared/api/client'
import { Alert } from '@/shared/ui/Alert'
import { Button } from '@/shared/ui/Button'
import { ImageOptionGrid } from '@/shared/ui/ImageOptionGrid'
import { OptionGrid } from '@/shared/ui/OptionGrid'
import { TopBar } from '@/shared/ui/TopBar'
import { authApi, type User } from '../api/authApi'
import { useSignupOptions } from '../hooks/useSignupOptions'
import { toInterestOptions } from './interestOptions'
import styles from './form.module.css'

interface Props {
  signupToken: string
  name: string
  /** 첫 단계에서 뒤로를 누르면 갈 곳 */
  backTo: string
  onDone: (accessToken: string, user: User) => void
}

const STEPS = 2

/**
 * 가입 마무리 — 한 화면에 한 가지만 묻는다.
 *  1단계: 좋아하는 것 (사진 카드, 여러 개)
 *  2단계: 사는 곳
 */
export function SignupProfileForm({ signupToken, name, backTo, onDone }: Props) {
  const { options, error: loadError } = useSignupOptions()
  const [step, setStep] = useState<1 | 2>(1)
  const [region, setRegion] = useState('')
  const [interests, setInterests] = useState<string[]>([])
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const max = options?.max_interests ?? 5

  function toggleInterest(v: string) {
    setError(null)
    if (interests.includes(v)) return setInterests(interests.filter((x) => x !== v))
    // 눌렀는데 아무 반응이 없으면 고장으로 오해한다 → 이유를 말해 준다
    if (interests.length >= max)
      return setError(`${max}개까지 고를 수 있어요. 다른 걸 고르려면 하나를 먼저 눌러서 빼 주세요.`)
    setInterests([...interests, v])
  }

  function goBack() {
    setError(null)
    setStep(1)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (step === 1) {
      if (interests.length === 0) return setError('좋아하는 것을 하나 이상 골라 주세요.')
      setError(null)
      setStep(2)
      window.scrollTo({ top: 0 })
      return
    }
    if (!region) return setError('사는 곳을 골라 주세요.')
    setPending(true)
    setError(null)
    try {
      const r = await authApi.signup(signupToken, region, interests)
      if (r.status === 'logged_in') onDone(r.access_token, r.user)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setPending(false)
    }
  }

  const topBar = <TopBar backTo={backTo} onBack={step === 2 ? goBack : undefined} />
  if (loadError)
    return (
      <>
        {topBar}
        <Alert>{loadError}</Alert>
      </>
    )
  if (!options)
    return (
      <>
        {topBar}
        <p role="status">불러오는 중…</p>
      </>
    )

  return (
    <>
      {topBar}
      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <StepProgress step={step} />

        {step === 1 ? (
          <>
            <h1 className={styles.title}>
              {name}님,
              <br />
              어떤 활동을 좋아하시나요?
            </h1>
            <ImageOptionGrid
              legend="좋아하는 것"
              legendHidden
              multiple
              options={toInterestOptions(options.interests)}
              selected={interests}
              onToggle={toggleInterest}
            />
          </>
        ) : (
          <>
            <h1 className={styles.title}>어디에 사세요?</h1>
            <OptionGrid
              legend="사는 곳"
              legendHidden
              options={options.regions.map((o) => ({ value: o.code, label: o.label }))}
              selected={region ? [region] : []}
              onToggle={(v) => {
                setRegion(v)
                setError(null)
              }}
            />
          </>
        )}

        {/* 목록이 길어도 '다음'이 늘 손 닿는 곳에 — 안내 문구도 버튼 바로 위에 */}
        <div className={styles.stickyActions}>
          {error && <Alert>{error}</Alert>}
          <Button type="submit" block large disabled={pending}>
            {step === 1 ? '다음' : pending ? '가입하는 중…' : '가입 완료'}
          </Button>
        </div>
      </form>
    </>
  )
}

/** 몇 번째 단계인지 — 막대 + 숫자 (색만으로 전달하지 않는다) */
function StepProgress({ step }: { step: number }) {
  return (
    <div className={styles.progress}>
      <div className={styles.progressBar} aria-hidden="true">
        {Array.from({ length: STEPS }, (_, i) => (
          <span key={i} className={styles.progressSeg} data-done={i < step} />
        ))}
      </div>
      <span className={styles.progressText}>
        <span className="sr-only">가입 단계 </span>
        {step} / {STEPS}
      </span>
    </div>
  )
}
