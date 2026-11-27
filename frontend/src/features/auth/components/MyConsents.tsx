import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { errorMessage } from '@/shared/api/client'
import { CONSENT_ORDER, LEGAL_DOCS } from '@/shared/legal/documents'
import { Alert } from '@/shared/ui/Alert'
import { Button } from '@/shared/ui/Button'
import { ConfirmSheet } from '@/shared/ui/ConfirmSheet'
import { authApi, type ConsentStatus } from '../api/authApi'
import { useAuth } from '../hooks/useAuth'
import styles from './MyConsents.module.css'

interface Props {
  /** 문서 전문 화면 주소 */
  docHref: (kind: string) => string
  /** 회원 탈퇴 화면 주소 */
  leaveHref: string
  /** 마음 건강 기록 동의·철회 — 기록 삭제가 함께라 wellbeing 이 맡는다 (페이지가 이어 준다) */
  setHealth: (agreed: boolean) => Promise<void>
}

const dateOf = (iso: string) => {
  const d = new Date(iso)
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`
}

/**
 * 마이페이지 맨 아래 → 약관 및 동의 (B6). 무엇에 언제 동의했는지 보여 주고, 문서를 다시 읽을 수 있다.
 * 필수 동의는 철회 대신 탈퇴로 안내하고, 선택(마음 건강 기록)만 여기서 켜고 끈다.
 */
export function MyConsents({ docHref, leaveHref, setHealth }: Props) {
  const { user, updateUser } = useAuth()
  const [items, setItems] = useState<ConsentStatus[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [askWithdraw, setAskWithdraw] = useState(false)
  const [pending, setPending] = useState(false)

  const load = useCallback(() => {
    authApi.consents().then(setItems, (e) => setError(errorMessage(e)))
  }, [])
  useEffect(load, [load])

  async function changeHealth(agreed: boolean) {
    setPending(true)
    setError(null)
    try {
      await setHealth(agreed)
      if (user) updateUser({ ...user, health_consent: agreed })
      setAskWithdraw(false)
      load()
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setPending(false)
    }
  }

  if (!items) return error ? <Alert>{error}</Alert> : <p role="status">불러오는 중…</p>
  const byKind = new Map(items.map((i) => [i.kind, i]))

  return (
    <div className={styles.wrap}>
      {error && <Alert>{error}</Alert>}
      <ul className={styles.list}>
        {CONSENT_ORDER.map((kind) => {
          const s = byKind.get(kind)
          if (!s) return null
          const doc = LEGAL_DOCS[kind]
          return (
            <li key={kind} className={styles.item}>
              <h2 className={styles.name}>
                <span className={styles.tag}>[{s.required ? '필수' : '선택'}]</span> {doc.title}
              </h2>
              <p className={styles.state} data-on={s.agreed || undefined}>
                {s.agreed ? '동의함' : '동의 안 함'}
                {s.decided_at && ` · ${dateOf(s.decided_at)}`}
              </p>
              <Link to={docHref(kind)} className={styles.read}>
                내용 읽어 보기
              </Link>
              {kind === 'health' &&
                (s.agreed ? (
                  <Button variant="secondary" block disabled={pending} onClick={() => setAskWithdraw(true)}>
                    동의 철회하기
                  </Button>
                ) : (
                  <Button block disabled={pending} onClick={() => changeHealth(true)}>
                    동의하기
                  </Button>
                ))}
            </li>
          )
        })}
      </ul>
      <p className={styles.note}>
        [필수] 항목은 서비스를 쓰는 데 꼭 필요해 따로 철회할 수 없어요. 그만 쓰시려면 회원 탈퇴를 해 주세요.
      </p>
      <Link to={leaveHref} className={styles.read}>
        회원 탈퇴하러 가기
      </Link>
      <Link to={docHref('policy')} className={styles.read}>
        {LEGAL_DOCS.policy.title} 보기
      </Link>

      <ConfirmSheet
        open={askWithdraw}
        title="마음 건강 기록 동의를 철회할까요?"
        confirmLabel="철회하고 기록 지우기"
        danger
        pending={pending}
        onConfirm={() => changeHealth(false)}
        onClose={() => setAskWithdraw(false)}
      >
        <p>지금까지의 마음 건강 점검 기록이 모두 지워지고 되돌릴 수 없어요. 앞으로 점검해도 결과를 저장하지 않아요.</p>
      </ConfirmSheet>
    </div>
  )
}
