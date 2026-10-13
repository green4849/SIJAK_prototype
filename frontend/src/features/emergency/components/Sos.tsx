import { CircleCheck, HeartHandshake, Phone, Siren, UserRound } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from '@/shared/lib/toast'
import { Alert } from '@/shared/ui/Alert'
import { Button } from '@/shared/ui/Button'
import { ICON, ICON_STROKE } from '@/shared/ui/icon'
import { Sheet } from '@/shared/ui/Sheet'
import { useGuardians, useSos } from '../hooks/useEmergency'
import styles from './Emergency.module.css'

/**
 * 긴급 도움 (C10) — 큰 버튼 하나 → 확인 한 번 → 보호자·담당 복지사에게 알림.
 * 잘못 누르는 일을 막으려고 확인 창을 한 번 거친다 (바로 전화하기는 확인 없이).
 */
export function SosPanel({ guardiansHref }: { guardiansHref: string }) {
  const guardians = useGuardians()
  const sos = useSos()
  const [confirm, setConfirm] = useState(false)
  const list = guardians.data ?? []

  async function send() {
    const r = await sos.send()
    if (r) setConfirm(false)
  }

  return (
    <div className={styles.panel}>
      {sos.result ? (
        <section className={styles.done} role="status" aria-labelledby="sos-done">
          <CircleCheck aria-hidden="true" size={ICON.lg} strokeWidth={ICON_STROKE} />
          <h2 id="sos-done" className={styles.doneTitle}>
            알렸어요
          </h2>
          {sos.result.notified.length > 0 && (
            <ul className={styles.notified}>
              {sos.result.notified.map((n) => (
                <li key={n.name}>
                  {n.name}님 ({n.relation})
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : (
        <button type="button" className={styles.sos} onClick={() => setConfirm(true)}>
          <Siren aria-hidden="true" size={ICON.lg} strokeWidth={ICON_STROKE} />
          도움 요청
        </button>
      )}

      <section className={styles.calls} aria-labelledby="call-title">
        <h2 id="call-title" className={styles.callsTitle}>
          바로 전화하기
        </h2>
        {list.map((g) => (
          <a key={g.id} href={`tel:${g.phone}`} className={styles.callRow}>
            <UserRound aria-hidden="true" size={ICON.md} strokeWidth={ICON_STROKE} />
            <span className={styles.callName}>
              {g.name} <span className={styles.callMeta}>{g.relation}</span>
            </span>
            <Phone aria-hidden="true" size={ICON.sm} strokeWidth={ICON_STROKE} />
          </a>
        ))}
        <a href="tel:119" className={styles.callRow} data-tone="danger">
          <Siren aria-hidden="true" size={ICON.md} strokeWidth={ICON_STROKE} />
          <span className={styles.callName}>
            119 <span className={styles.callMeta}>응급·구급</span>
          </span>
          <Phone aria-hidden="true" size={ICON.sm} strokeWidth={ICON_STROKE} />
        </a>
        <a href="tel:109" className={styles.callRow}>
          <HeartHandshake aria-hidden="true" size={ICON.md} strokeWidth={ICON_STROKE} />
          <span className={styles.callName}>
            109 <span className={styles.callMeta}>마음 상담</span>
          </span>
          <Phone aria-hidden="true" size={ICON.sm} strokeWidth={ICON_STROKE} />
        </a>
        {guardians.data && list.length === 0 && (
          <Link to={guardiansHref} className={styles.addLink}>
            보호자 등록하기
          </Link>
        )}
      </section>

      <Sheet open={confirm} title="도움을 요청할까요?" onClose={() => setConfirm(false)}>
        {list.length > 0 ? (
          <ul className={styles.notified}>
            {list.map((g) => (
              <li key={g.id}>
                {g.name}님 ({g.relation})
              </li>
            ))}
          </ul>
        ) : (
          <p>등록된 보호자가 없어요. 담당 복지관에 알려요.</p>
        )}
        {sos.error && <Alert>{sos.error}</Alert>}
        <Button variant="danger" block large disabled={sos.pending} onClick={() => void send()}>
          {sos.pending ? '알리는 중…' : '알리기'}
        </Button>
      </Sheet>
    </div>
  )
}

/** 다른 화면(말동무 위기 안내 등)에 붙이는 '보호자에게 알리기' 버튼 — 확인 없이 바로 */
export function NotifyGuardianButton() {
  const sos = useSos()
  async function send() {
    const r = await sos.send()
    if (!r) return toast('알리지 못했어요. 바로 전화해 주세요.', 'error')
    const who = r.notified.map((n) => `${n.name}님`).join(', ')
    toast(who ? `${who}께 알렸어요` : '담당 복지관에 알렸어요')
  }
  if (sos.result)
    return (
      <p className={styles.sentNote} role="status">
        <CircleCheck aria-hidden="true" size={ICON.inline} strokeWidth={ICON_STROKE} /> 보호자에게 알렸어요
      </p>
    )
  return (
    <Button variant="secondary" block disabled={sos.pending} onClick={() => void send()}>
      보호자에게 알리기
    </Button>
  )
}
