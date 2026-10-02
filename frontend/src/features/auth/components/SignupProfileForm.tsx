import { useState, type FormEvent } from 'react'
import { errorMessage } from '@/shared/api/client'
import { Alert } from '@/shared/ui/Alert'
import { Button } from '@/shared/ui/Button'
import { OptionGrid } from '@/shared/ui/OptionGrid'
import { authApi, type User } from '../api/authApi'
import { useSignupOptions } from '../hooks/useSignupOptions'
import styles from './form.module.css'

interface Props {
  signupToken: string
  name: string
  onDone: (accessToken: string, user: User) => void
}

/** 가입 마무리 — 사는 곳 + 좋아하는 것 */
export function SignupProfileForm({ signupToken, name, onDone }: Props) {
  const { options, error: loadError } = useSignupOptions()
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

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!region) return setError('사는 곳을 골라 주세요.')
    if (interests.length === 0) return setError('좋아하는 것을 하나 이상 골라 주세요.')
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

  if (loadError) return <Alert>{loadError}</Alert>
  if (!options) return <p role="status">불러오는 중…</p>

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <div>
        <h1 className={styles.title}>{name}님, 반가워요</h1>
        <p className={styles.lead}>잘 맞는 친구를 찾도록 두 가지만 알려 주세요.</p>
      </div>

      <OptionGrid
        legend="사는 곳"
        options={options.regions.map((o) => ({ value: o.code, label: o.label }))}
        selected={region ? [region] : []}
        onToggle={(v) => {
          setRegion(v)
          setError(null)
        }}
      />

      <OptionGrid
        legend="좋아하는 것"
        hint={`${max}개까지 고를 수 있어요 (${interests.length}/${max})`}
        multiple
        options={options.interests.map((o) => ({ value: o.code, label: o.label }))}
        selected={interests}
        onToggle={toggleInterest}
      />

      {error && <Alert>{error}</Alert>}

      <Button type="submit" block disabled={pending}>
        {pending ? '가입하는 중…' : '가입 완료'}
      </Button>
    </form>
  )
}
