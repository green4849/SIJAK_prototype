import { useState, type FormEvent } from 'react'
import { errorMessage } from '@/shared/api/client'
import { Alert } from '@/shared/ui/Alert'
import { Button } from '@/shared/ui/Button'
import { authApi } from '../api/authApi'
import { useAuth } from '../hooks/useAuth'
import { useSignupOptions } from '../hooks/useSignupOptions'
import { requiredAgreed, type ConsentValue } from '../lib/consent'
import { ConsentForm } from './ConsentForm'
import styles from './form.module.css'

/**
 * 다시 동의 받기 (B6) — 약관이 바뀌었거나, 동의 단계가 생기기 전에 가입한 분.
 * 필수 항목에 동의해야 앱을 계속 쓸 수 있다. 선택(마음 건강 기록)은 이미 동의했으면 체크된 채로 둔다.
 */
export function ConsentRenewal({ onDone }: { onDone: () => void }) {
  const { user, updateUser } = useAuth()
  const { options, error: loadError } = useSignupOptions()
  const [value, setValue] = useState<ConsentValue>(() => ({ health: !!user?.health_consent }))
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!options) return
    if (!requiredAgreed(options.consents, value)) return setError('[필수] 항목에 모두 동의해 주세요.')
    setPending(true)
    setError(null)
    try {
      // 동의한 것만 보낸다 — 선택 항목을 끄는 것(철회)은 마이페이지 '약관 및 동의'에서
      const items = options.consents
        .filter((d) => value[d.kind])
        .map((d) => ({ kind: d.kind, version: d.version, agreed: true }))
      updateUser(await authApi.agreeConsents(items))
      onDone()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setPending(false)
    }
  }

  if (loadError) return <Alert>{loadError}</Alert>
  if (!options) return <p role="status">불러오는 중…</p>
  return (
    <form className={styles.form} onSubmit={submit} noValidate>
      <h1 className={styles.title}>약관을 다시 확인해 주세요</h1>
      <p className={styles.lead}>약관이 새로 생기거나 바뀌었어요. [필수] 항목에 동의하면 계속 쓸 수 있어요.</p>
      <ConsentForm
        docs={options.consents}
        value={value}
        onChange={(v) => {
          setValue(v)
          setError(null)
        }}
      />
      <div className={styles.stickyActions}>
        {error && <Alert>{error}</Alert>}
        <Button type="submit" block large disabled={pending}>
          {pending ? '저장하는 중…' : '동의하고 계속하기'}
        </Button>
      </div>
    </form>
  )
}
