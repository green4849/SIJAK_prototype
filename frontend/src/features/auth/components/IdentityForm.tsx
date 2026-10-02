import { useState, type FormEvent } from 'react'
import { Alert } from '@/shared/ui/Alert'
import { Button } from '@/shared/ui/Button'
import { OptionGrid } from '@/shared/ui/OptionGrid'
import { TextField } from '@/shared/ui/TextField'
import type { Gender, PassStartInput } from '../api/authApi'
import styles from './form.module.css'

interface Props {
  pending: boolean
  error: string | null
  onSubmit: (input: PassStartInput) => void
}

const GENDERS = [
  { value: 'F', label: '여성' },
  { value: 'M', label: '남성' },
]

const digitsOnly = (v: string, max: number) => v.replace(/\D/g, '').slice(0, max)

function formatPhone(v: string) {
  const d = digitsOnly(v, 11)
  if (d.length < 4) return d
  if (d.length < 8) return `${d.slice(0, 3)}-${d.slice(3)}`
  return `${d.slice(0, 3)}-${d.slice(3, d.length - 4)}-${d.slice(-4)}`
}

/** 실제 존재하는 날짜인지 확인 후 YYYY-MM-DD */
function toIsoDate(y: string, m: string, d: string): string | null {
  const yy = Number(y)
  const mm = Number(m)
  const dd = Number(d)
  if (y.length !== 4 || yy < 1900 || !mm || !dd) return null
  const date = new Date(Date.UTC(yy, mm - 1, dd))
  if (date.getUTCMonth() !== mm - 1 || date.getUTCDate() !== dd) return null
  return `${y}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`
}

/** 본인인증 1단계 — 이름·생년월일·휴대전화·성별 */
export function IdentityForm({ pending, error, onSubmit }: Props) {
  const [name, setName] = useState('')
  const [year, setYear] = useState('')
  const [month, setMonth] = useState('')
  const [day, setDay] = useState('')
  const [phone, setPhone] = useState('')
  const [gender, setGender] = useState<Gender | ''>('')
  const [localError, setLocalError] = useState<string | null>(null)
  // 고치기 시작하면 이전 오류는 바로 지운다 (다 고쳤는데 오류가 남아 있으면 혼란)
  const [showServerError, setShowServerError] = useState(true)

  const edit =
    <T,>(set: (v: T) => void) =>
    (v: T) => {
      set(v)
      setLocalError(null)
      setShowServerError(false)
    }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const birth = toIsoDate(year, month, day)
    if (!name.trim()) return setLocalError('이름을 적어 주세요.')
    if (!birth) return setLocalError('태어난 날을 다시 확인해 주세요.')
    if (digitsOnly(phone, 11).length < 10) return setLocalError('휴대전화 번호를 다시 확인해 주세요.')
    if (!gender) return setLocalError('성별을 골라 주세요.')
    setLocalError(null)
    setShowServerError(true)
    onSubmit({ name: name.trim(), birth_date: birth, phone: digitsOnly(phone, 11), gender })
  }

  const shownError = localError ?? (showServerError ? error : null)

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <div>
        <h1 className={styles.title}>본인 확인</h1>
        <p className={styles.lead}>안전한 이용을 위해 한 번만 확인할게요.</p>
      </div>

      <TextField
        label="이름"
        autoComplete="name"
        value={name}
        onChange={(e) => edit(setName)(e.target.value)}
      />

      <fieldset className={styles.dateGroup}>
        <legend className={styles.groupLegend}>태어난 날</legend>
        <div className={styles.row}>
          <TextField
            label="년"
            hint="예: 1955"
            inputMode="numeric"
            value={year}
            onChange={(e) => edit(setYear)(digitsOnly(e.target.value, 4))}
          />
          <TextField
            label="월"
            inputMode="numeric"
            value={month}
            onChange={(e) => edit(setMonth)(digitsOnly(e.target.value, 2))}
          />
          <TextField
            label="일"
            inputMode="numeric"
            value={day}
            onChange={(e) => edit(setDay)(digitsOnly(e.target.value, 2))}
          />
        </div>
      </fieldset>

      <TextField
        label="휴대전화 번호"
        hint="숫자만 적으면 돼요"
        type="tel"
        inputMode="numeric"
        autoComplete="tel"
        value={phone}
        onChange={(e) => edit(setPhone)(formatPhone(e.target.value))}
      />

      <OptionGrid
        legend="성별"
        options={GENDERS}
        selected={gender ? [gender] : []}
        onToggle={(v) => edit(setGender)(v as Gender)}
      />

      {shownError && <Alert>{shownError}</Alert>}

      <Button type="submit" block disabled={pending}>
        {pending ? '확인하는 중…' : '인증번호 받기'}
      </Button>
    </form>
  )
}
