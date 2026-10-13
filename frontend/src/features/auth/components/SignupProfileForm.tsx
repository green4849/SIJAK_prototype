import { useState, type FormEvent } from 'react'
import { errorMessage } from '@/shared/api/client'
import { Alert } from '@/shared/ui/Alert'
import { Button } from '@/shared/ui/Button'
import { PhotoChoiceGrid } from '@/shared/ui/PhotoChoiceGrid'
import { TopBar } from '@/shared/ui/TopBar'
import { authApi, type User } from '../api/authApi'
import { setAccessToken } from '../api/session'
import { useSignupOptions } from '../hooks/useSignupOptions'
import { toInterestChoices } from './interestChoices'
import { LocationAgreement, type AgreedLocation } from './LocationAgreement'
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
 * 가입 마무리 — 한 화면에 질문 하나 (A24)
 *  1/2 좋아하는 것: 둥근 사진 3열, 여러 개
 *  2/2 사는 동네: 위치 정보 수집 동의 (A21)
 */
export function SignupProfileForm({ signupToken, name, backTo, onDone }: Props) {
  const { options, error: loadError } = useSignupOptions()
  const [step, setStep] = useState<1 | 2>(1)
  const [located, setLocated] = useState<AgreedLocation | null>(null)
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
    window.scrollTo({ top: 0 })
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (step === 1) {
      if (interests.length === 0) return
      setError(null)
      setStep(2)
      window.scrollTo({ top: 0 })
      return
    }
    if (!located) return setError('위치 정보 수집에 동의해 주세요.')
    setPending(true)
    setError(null)
    try {
      const r = await authApi.signup(signupToken, located.regionCode, interests)
      if (r.status !== 'logged_in') return
      let user = r.user
      // 동의한 위치를 '같은 동네' 이웃 찾기용으로도 저장 — 친구 탭에서 다시 묻지 않게
      setAccessToken(r.access_token)
      user = await authApi.updateLocation(located.pos.lat, located.pos.lng).catch(() => user)
      onDone(r.access_token, user)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setPending(false)
    }
  }

  // 진행 막대는 '뒤로'와 같은 줄에 (시안 C)
  const topBar = (
    <TopBar backTo={backTo} onBack={step === 2 ? goBack : undefined} right={<StepProgress step={step} />} />
  )
  if (loadError || !options)
    return (
      <>
        {topBar}
        {loadError ? <Alert>{loadError}</Alert> : <p role="status">불러오는 중…</p>}
      </>
    )

  return (
    <>
      {topBar}
      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        {step === 1 ? (
          <>
            <h1 className={styles.title}>
              {name}님,
              <br />
              어떤 활동을 좋아하시나요?
            </h1>
            <PhotoChoiceGrid
              legend="좋아하는 것"
              legendHidden
              options={toInterestChoices(options.interests)}
              selected={interests}
              onToggle={toggleInterest}
            />
          </>
        ) : (
          <>
            <h1 className={styles.title}>사는 동네를 알려 주세요</h1>
            <LocationAgreement
              regions={options.regions}
              onChange={(l) => {
                setLocated(l)
                setError(null)
              }}
            />
          </>
        )}

        {/* 목록이 길어도 버튼이 늘 손 닿는 곳에 — 안내도 버튼 바로 위에 */}
        <div className={styles.stickyActions}>
          {error && <Alert>{error}</Alert>}
          {step === 1 ? (
            // 아직 안 골랐으면 버튼 자체가 할 일을 알려 준다 (오류창 대신)
            <Button type="submit" block large disabled={interests.length === 0}>
              {interests.length === 0 ? (
                '하나 이상 골라 주세요'
              ) : (
                <>
                  다음 <span className={styles.count}>{interests.length}개 골랐어요</span>
                </>
              )}
            </Button>
          ) : (
            <Button type="submit" block large disabled={pending}>
              {pending ? '가입하는 중…' : '가입 완료'}
            </Button>
          )}
        </div>
      </form>
    </>
  )
}

/** 몇 번째 단계인지 — 막대 (화면 읽기 기능에는 "가입 1/2단계") */
function StepProgress({ step }: { step: number }) {
  return (
    <div className={styles.progress} role="img" aria-label={`가입 ${step}/${STEPS}단계`}>
      {Array.from({ length: STEPS }, (_, i) => (
        <span key={i} className={styles.progressSeg} data-done={i < step} />
      ))}
    </div>
  )
}
