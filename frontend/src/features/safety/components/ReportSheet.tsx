import { useState } from 'react'
import { errorMessage } from '@/shared/api/client'
import { Alert } from '@/shared/ui/Alert'
import { Button } from '@/shared/ui/Button'
import { OptionGrid } from '@/shared/ui/OptionGrid'
import { Sheet } from '@/shared/ui/Sheet'
import { safetyApi } from '../api/safetyApi'
import { useReportReasons } from '../hooks/useSafety'

interface Props {
  open: boolean
  targetUserId: string
  targetName: string
  messageId?: number
  onClose: () => void
  /** 신고 = 차단까지 같이 된다 */
  onDone: () => void
}

/** 신고하기 — 이유 하나 고르고 보내면 차단까지 함께 (어르신이 두 번 일할 필요 없게) */
export function ReportSheet({ open, targetUserId, targetName, messageId, onClose, onDone }: Props) {
  const { data: reasons } = useReportReasons()
  const [reason, setReason] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    if (!reason) return setError('신고 이유를 골라 주세요.')
    setPending(true)
    setError(null)
    try {
      await safetyApi.report(targetUserId, reason, messageId)
      onDone()
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setPending(false)
    }
  }

  return (
    <Sheet open={open} title={`${targetName}님 신고하기`} onClose={onClose}>
      {reasons && (
        <OptionGrid
          legend="어떤 일이 있었나요?"
          columns={1}
          options={reasons.map((r) => ({ value: r.code, label: r.label }))}
          selected={reason ? [reason] : []}
          onToggle={(v) => {
            setReason(v)
            setError(null)
          }}
        />
      )}
      <p>신고하면 이 분과는 더 이상 대화할 수 없어요.</p>
      {error && <Alert>{error}</Alert>}
      <Button variant="danger" block large disabled={pending} onClick={submit}>
        {pending ? '보내는 중…' : '신고하고 차단하기'}
      </Button>
    </Sheet>
  )
}
