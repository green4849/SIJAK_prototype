import { useState, type FormEvent } from 'react'
import { Alert } from '@/shared/ui/Alert'
import { Button } from '@/shared/ui/Button'
import { TextField } from '@/shared/ui/TextField'
import styles from './form.module.css'

interface Props {
  devCode: string | null
  pending: boolean
  error: string | null
  onSubmit: (code: string) => void
  onResend: () => void
  onBack: () => void
}

/** 본인인증 2단계 — 인증번호 6자리 */
export function CodeForm({ devCode, pending, error, onSubmit, onResend, onBack }: Props) {
  const [code, setCode] = useState('')

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (code.length === 6) onSubmit(code)
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <div>
        <h1 className={styles.title}>인증번호 입력</h1>
        <p className={styles.lead}>문자로 받은 숫자 6개를 적어 주세요.</p>
      </div>

      {devCode && (
        <Alert tone="info">
          [시연용] 인증번호: <strong>{devCode}</strong>
        </Alert>
      )}

      <TextField
        label="인증번호"
        inputMode="numeric"
        autoComplete="one-time-code"
        className={styles.code}
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
        autoFocus
      />

      {error && <Alert>{error}</Alert>}

      <div className={styles.actions}>
        <Button type="submit" block disabled={pending || code.length !== 6}>
          {pending ? '확인하는 중…' : '확인'}
        </Button>
        <Button variant="secondary" block disabled={pending} onClick={onResend}>
          인증번호 다시 받기
        </Button>
        <Button variant="secondary" block disabled={pending} onClick={onBack}>
          정보 다시 입력하기
        </Button>
      </div>
    </form>
  )
}
