import { Phone, UserRound } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { errorMessage } from '@/shared/api/client'
import { toast } from '@/shared/lib/toast'
import { Alert } from '@/shared/ui/Alert'
import { Button } from '@/shared/ui/Button'
import { ICON, ICON_STROKE } from '@/shared/ui/icon'
import { OptionGrid } from '@/shared/ui/OptionGrid'
import { TextField } from '@/shared/ui/TextField'
import { emergencyApi } from '../api/emergencyApi'
import { useGuardians } from '../hooks/useEmergency'
import styles from './Emergency.module.css'

const RELATIONS = ['아들', '딸', '배우자', '형제자매', '담당 복지사', '이웃'].map((v) => ({ value: v, label: v }))
const MAX = 3

/** 보호자 목록 + 추가 — 긴급 도움을 누르면 이분들께 알림이 가요 */
export function GuardianManager() {
  const { data, error, loading, setData, remove } = useGuardians()
  const [adding, setAdding] = useState(false)

  if (error) return <Alert>{error}</Alert>
  if (loading || !data) return <p role="status">불러오는 중…</p>

  return (
    <div className={styles.panel}>
      {data.length === 0 && <p className={styles.empty}>아직 등록한 보호자가 없어요.</p>}
      <ul className={styles.guardians}>
        {data.map((g) => (
          <li key={g.id} className={styles.guardian}>
            <UserRound aria-hidden="true" size={ICON.md} strokeWidth={ICON_STROKE} className={styles.guardianIcon} />
            <div className={styles.guardianText}>
              <p className={styles.guardianName}>
                {g.name} <span className={styles.callMeta}>{g.relation}</span>
              </p>
              <p className={styles.callMeta}>{g.phone_masked}</p>
            </div>
            <div className={styles.guardianActions}>
              <a href={`tel:${g.phone}`} className={styles.smallBtn} aria-label={`${g.name}님께 전화`}>
                <Phone aria-hidden="true" size={ICON.inline} strokeWidth={ICON_STROKE} />
                전화
              </a>
              <button type="button" className={styles.smallBtn} onClick={() => void remove(g.id, g.name)} aria-label={`${g.name}님 빼기`}>
                빼기
              </button>
            </div>
          </li>
        ))}
      </ul>

      {adding ? (
        <GuardianForm
          onCancel={() => setAdding(false)}
          onAdded={(g) => {
            setData((cur) => [...(cur ?? []), g])
            setAdding(false)
            toast(`${g.name}님을 보호자로 등록했어요`)
          }}
        />
      ) : (
        data.length < MAX && (
          <Button variant="secondary" block onClick={() => setAdding(true)}>
            보호자 추가
          </Button>
        )
      )}
    </div>
  )
}

type Added = Awaited<ReturnType<typeof emergencyApi.addGuardian>>

function GuardianForm({ onAdded, onCancel }: { onAdded: (g: Added) => void; onCancel: () => void }) {
  const [name, setName] = useState('')
  const [relation, setRelation] = useState('')
  const [phone, setPhone] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return setError('이름을 적어 주세요.')
    if (!relation) return setError('어떤 사이인지 골라 주세요.')
    setPending(true)
    setError(null)
    try {
      onAdded(await emergencyApi.addGuardian({ name: name.trim(), relation, phone }))
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setPending(false)
    }
  }

  return (
    <form className={styles.form} onSubmit={submit} noValidate>
      <TextField label="이름" value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" />
      <OptionGrid
        legend="어떤 사이인가요?"
        options={RELATIONS}
        selected={relation ? [relation] : []}
        onToggle={setRelation}
      />
      <TextField
        label="휴대전화 번호"
        hint="숫자만 적으면 돼요"
        inputMode="tel"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        autoComplete="off"
      />
      {error && <Alert>{error}</Alert>}
      <div className={styles.formActions}>
        <Button type="submit" disabled={pending}>
          {pending ? '저장하는 중…' : '등록하기'}
        </Button>
        <Button variant="secondary" onClick={onCancel}>
          취소
        </Button>
      </div>
    </form>
  )
}
