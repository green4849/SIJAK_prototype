import { useState, type FormEvent } from 'react'
import { Alert } from '@/shared/ui/Alert'
import { Button } from '@/shared/ui/Button'
import { TextField } from '@/shared/ui/TextField'
import styles from './form.module.css'

interface Props {
  devCode: string | null
  /** 실제 문자를 보낸 번호 (Firebase). Mock 이면 null */
  sentTo: string | null
  pending: boolean
  error: string | null
  onSubmit: (code: string) => void
  onResend: () => void
  onBack: () => void
}

/** 전화 로그인 2단계 — 인증번호 6자리 */
export function CodeForm({ devCode, sentTo, pending, error, onSubmit, onResend, onBack }: Props) {
  const [code, setCode] = useState('')

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (code.length === 6) onSubmit(code)
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <div>
        <h1 className={styles.title}>인증번호 입력</h1>
        {sentTo && (
          <p className={styles.lead}>
            {phoneText(sentTo)} 번호로 문자를 보냈어요. 받은 6자리를 적어 주세요.
          </p>
        )}
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

/** 01012345678 → 010-1234-5678 */
function phoneText(digits: string) {
  const d = digits.replace(/\D/g, '')
  return d.length === 11 ? `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}` : d.length === 10 ? `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}` : d
}
