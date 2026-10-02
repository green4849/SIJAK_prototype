import { useState, type FormEvent } from 'react'
import { errorMessage } from '@/shared/api/client'
import { Alert } from '@/shared/ui/Alert'
import { Button } from '@/shared/ui/Button'
import { OptionGrid } from '@/shared/ui/OptionGrid'
import { TextArea } from '@/shared/ui/TextArea'
import { authApi, type User } from '../api/authApi'
import { useSignupOptions } from '../hooks/useSignupOptions'
import styles from './form.module.css'

const INTRO_MAX = 60 // backend INTRO_MAX_LEN

interface Props {
  user: User
  onSaved: (user: User) => void
}

/** ⑨ → 내 프로필 관리: 한 줄 소개 · 사는 곳 · 좋아하는 것 */
export function ProfileEditForm({ user, onSaved }: Props) {
  const { options, error: loadError } = useSignupOptions()
  const [intro, setIntro] = useState(user.intro)
  const [region, setRegion] = useState(user.region_code)
  const [interests, setInterests] = useState<string[]>(user.interests)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const max = options?.max_interests ?? 5

  function toggleInterest(v: string) {
    setError(null)
    if (interests.includes(v)) return setInterests(interests.filter((x) => x !== v))
    if (interests.length >= max)
      return setError(`${max}개까지 고를 수 있어요. 다른 걸 고르려면 하나를 먼저 눌러서 빼 주세요.`)
    setInterests([...interests, v])
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (interests.length === 0) return setError('좋아하는 것을 하나 이상 골라 주세요.')
    setPending(true)
    setError(null)
    try {
      onSaved(await authApi.updateMe({ intro, region_code: region, interests }))
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
      <TextArea
        label="한 줄 소개"
        hint="이웃에게 보여요. 예: 산책과 옛날 노래를 좋아해요"
        maxLength={INTRO_MAX}
        value={intro}
        onChange={(e) => setIntro(e.target.value)}
      />

      <OptionGrid
        legend="사는 곳"
        options={options.regions.map((o) => ({ value: o.code, label: o.label }))}
        selected={[region]}
        onToggle={setRegion}
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

      <Button type="submit" block large disabled={pending}>
        {pending ? '저장하는 중…' : '저장하기'}
      </Button>
    </form>
  )
}
