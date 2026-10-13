import { useState } from 'react'
import { errorMessage } from '@/shared/api/client'
import { toast } from '@/shared/lib/toast'
import { Alert } from '@/shared/ui/Alert'
import { Button } from '@/shared/ui/Button'
import { OptionGrid } from '@/shared/ui/OptionGrid'
import { Sheet } from '@/shared/ui/Sheet'
import { authApi } from '../api/authApi'
import { useAuth } from '../hooks/useAuth'
import styles from './form.module.css'

const REASONS = ['쓰기 어려워요', '맞는 친구가 없어요', '다른 앱을 써요', '그 밖에'].map((v) => ({ value: v, label: v }))

/** B3 회원 탈퇴 — 무엇이 지워지는지 먼저 보여 주고, 확인 한 번 더 (보고서 4.6.3: 30일 뒤 완전 삭제) */
export function WithdrawForm() {
  const { signOut } = useAuth()
  const [reason, setReason] = useState<string | null>(null)
  const [confirm, setConfirm] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function withdraw() {
    setPending(true)
    setError(null)
    try {
      const { delete_at } = await authApi.withdraw(reason)
      const [, m, d] = delete_at.split('-').map(Number)
      await signOut()
      toast(`탈퇴했어요. ${m}월 ${d}일에 모두 지워져요`)
    } catch (e) {
      setError(errorMessage(e))
      setPending(false)
    }
  }

  return (
    <div className={styles.form}>
      <ul className={styles.notice}>
        <li>친구·대화·포인트가 모두 사라져요</li>
        <li>30일 뒤 개인정보를 완전히 지워요</li>
        <li>음성 메시지도 함께 지워요</li>
      </ul>
      <OptionGrid
        legend="떠나시는 이유 (고르지 않아도 돼요)"
        columns={1}
        options={REASONS}
        selected={reason ? [reason] : []}
        onToggle={(v) => setReason((cur) => (cur === v ? null : v))}
      />
      <Button variant="danger" block large onClick={() => setConfirm(true)}>
        탈퇴하기
      </Button>

      <Sheet open={confirm} title="정말 탈퇴할까요?" onClose={() => setConfirm(false)}>
        {error && <Alert>{error}</Alert>}
        <Button variant="danger" block large disabled={pending} onClick={() => void withdraw()}>
          {pending ? '처리하는 중…' : '네, 탈퇴할게요'}
        </Button>
      </Sheet>
    </div>
  )
}
