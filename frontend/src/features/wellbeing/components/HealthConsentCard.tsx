import { useState } from 'react'
import { Link } from 'react-router-dom'
import { errorMessage } from '@/shared/api/client'
import { LEGAL_DOCS } from '@/shared/legal/documents'
import { LegalSummary } from '@/shared/legal/LegalText'
import { Alert } from '@/shared/ui/Alert'
import { Button, ButtonLink } from '@/shared/ui/Button'
import { wellbeingApi } from '../api/wellbeingApi'
import styles from './Wellbeing.module.css'

interface Props {
  /** 동의를 마치면 — 화면이 사용자 정보(health_consent)를 고친다 */
  onAgreed: () => void
  /** '나중에 할게요'로 갈 곳 */
  laterTo: string
  /** 약관 전문 화면 주소 (/legal/health) */
  docHref: string
}

/**
 * 마음 건강 점검 전에 — 결과는 민감정보(건강)라 따로 동의를 받는다 (B6, 개인정보 보호법 제23조).
 * 가입 때 동의하지 않은 분이 점검을 열면 이 카드가 먼저 나온다.
 */
export function HealthConsentCard({ onAgreed, laterTo, docHref }: Props) {
  const doc = LEGAL_DOCS.health
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function agree() {
    setPending(true)
    setError(null)
    try {
      await wellbeingApi.setHealthConsent(true)
      onAgreed()
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setPending(false)
    }
  }

  return (
    <div className={styles.card}>
      <h2 className={styles.cardTitle}>점검 결과를 저장해도 될까요?</h2>
      <LegalSummary doc={doc} />
      <Link to={docHref}>{doc.title} 전체 보기</Link>
      {error && <Alert>{error}</Alert>}
      <Button block large disabled={pending} onClick={agree}>
        {pending ? '저장하는 중…' : '동의하고 점검하기'}
      </Button>
      <ButtonLink to={laterTo} variant="secondary" block>
        나중에 할게요
      </ButtonLink>
    </div>
  )
}
