import { useState, type FormEvent } from 'react'
import { errorMessage } from '@/shared/api/client'
import { Alert } from '@/shared/ui/Alert'
import { Button } from '@/shared/ui/Button'
import { OptionGrid } from '@/shared/ui/OptionGrid'
import { TextField } from '@/shared/ui/TextField'
import { TopBar } from '@/shared/ui/TopBar'
import { authApi, type User } from '../api/authApi'
import { setAccessToken } from '../api/session'
import { useSignupOptions } from '../hooks/useSignupOptions'
import { requiredAgreed, type ConsentValue } from '../lib/consent'
import { ConsentForm } from './ConsentForm'
import { LocationAgreement, type AgreedLocation } from './LocationAgreement'
import styles from './form.module.css'

interface Props {
  signupToken: string
  name: string
  provider?: 'kakao'
  backTo: string
  onDone: (accessToken: string, user: User) => void
}

/** 카카오 또는 시연용 로그인 후 프로필·동의 → 활동 지역. 관심사는 성향조사에서 고른다. */
export function SignupProfileForm({ signupToken, name, provider, backTo, onDone }: Props) {
  const { options, error: loadError } = useSignupOptions()
  const [step, setStep] = useState<0 | 1 | 2>(provider === 'kakao' ? 0 : 1)
  const [profile, setProfile] = useState<{ name: string; birth_date: string; gender: '' | 'F' | 'M' }>({ name, birth_date: '', gender: '' })
  const [consents, setConsents] = useState<ConsentValue>({})
  const [located, setLocated] = useState<AgreedLocation | null>(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (step === 0) {
      if (!profile.name.trim() || !profile.birth_date || !profile.gender) return setError('이름, 생년월일, 성별을 확인해 주세요.')
      setError(null)
      setStep(1)
      window.scrollTo({ top: 0 })
      return
    }
    if (step === 1) {
      if (!options || !requiredAgreed(options.consents, consents)) return setError('[필수] 항목에 모두 동의해 주세요.')
      setError(null)
      setStep(2)
      window.scrollTo({ top: 0 })
      return
    }
    if (!located) return setError('활동할 동네를 정해 주세요.')
    setPending(true)
    setError(null)
    try {
      const choices = (options?.consents ?? []).map((d) => ({ kind: d.kind, version: d.version, agreed: !!consents[d.kind] }))
      const r = await authApi.signup(signupToken, located.regionCode, [], choices, provider === 'kakao' ? { ...profile, name: profile.name.trim(), gender: profile.gender as 'F' | 'M' } : undefined, located.areaName)
      if (r.status !== 'logged_in') return
      let user = r.user
      setAccessToken(r.access_token)
      if (located.pos) user = await authApi.updateLocation(located.pos.lat, located.pos.lng, located.regionCode, located.areaName).catch(() => user)
      onDone(r.access_token, user)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setPending(false)
    }
  }

  const topBar = (
    <TopBar
      backTo={backTo}
      onBack={step > (provider === 'kakao' ? 0 : 1) ? () => { setError(null); setStep(step === 2 ? 1 : 0) } : undefined}
      right={
        <div className={styles.progress} role="img" aria-label={`가입 ${provider === 'kakao' ? step + 1 : step}/${provider === 'kakao' ? 3 : 2}단계`}>
          {Array.from({ length: provider === 'kakao' ? 3 : 2 }, (_, i) => i + 1).map((i) => <span key={i} className={styles.progressSeg} data-done={i <= (provider === 'kakao' ? step + 1 : step)} />)}
        </div>
      }
    />
  )

  if (loadError || !options)
    return <>{topBar}{loadError ? <Alert>{loadError}</Alert> : <p role="status">불러오는 중…</p>}</>

  return (
    <>
      {topBar}
      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        {step === 0 ? (
          <>
            <h1 className={styles.title}>프로필을 알려 주세요</h1>
            <p className={styles.lead}>이 정보는 직접 입력해요. 카카오 로그인은 본인확인이 아니에요.</p>
            <TextField label="이름" autoComplete="name" maxLength={50} value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} />
            <TextField label="생년월일" type="date" value={profile.birth_date} onChange={(e) => setProfile({ ...profile, birth_date: e.target.value })} />
            <OptionGrid legend="성별" options={[{ value: 'F', label: '여성' }, { value: 'M', label: '남성' }]} selected={profile.gender ? [profile.gender] : []} onToggle={(v) => setProfile({ ...profile, gender: v as 'F' | 'M' })} />
          </>
        ) : step === 1 ? (
          <>
            <h1 className={styles.title}>{name}님,<br />약관을 확인해 주세요</h1>
            <p className={styles.lead}>[필수] 항목에 동의해야 가입할 수 있어요.</p>
            <ConsentForm docs={options.consents} value={consents} onChange={(v) => { setConsents(v); setError(null) }} />
          </>
        ) : (
          <>
            <h1 className={styles.title}>활동할 동네를 알려 주세요</h1>
            <LocationAgreement regions={options.regions} onChange={(l) => { setLocated(l); setError(null) }} />
          </>
        )}
        <div className={styles.stickyActions}>
          {error && <Alert>{error}</Alert>}
          <Button type="submit" block large disabled={pending}>
            {step === 0 ? '다음' : step === 1 ? '동의하고 다음' : pending ? '가입하는 중…' : '가입 완료'}
          </Button>
        </div>
      </form>
    </>
  )
}
