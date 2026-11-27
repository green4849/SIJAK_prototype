import { CircleAlert, CircleCheck, HeartHandshake, Phone, Siren, UserRound } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from '@/shared/lib/toast'
import { Alert } from '@/shared/ui/Alert'
import { Button } from '@/shared/ui/Button'
import { CallLink } from '@/shared/ui/CallLink'
import { ICON, ICON_STROKE } from '@/shared/ui/icon'
import { Sheet } from '@/shared/ui/Sheet'
import { useGuardians, useSmsEnabled, useSos } from '../hooks/useEmergency'
import { notifiedLabel, sosSummary } from '../lib/sosMessage'
import styles from './Emergency.module.css'

/**
 * 긴급 도움 (C10) — 큰 버튼 하나 → 확인 한 번 → 요청을 기록하고, 문자 발송이 켜져 있으면 보호자마다 문자.
 * 잘못 누르는 일을 막으려고 확인 창을 한 번 거친다 (바로 전화하기는 확인 없이).
 * 결과 문구는 서버가 실제로 한 일(보호자별 문자 결과)만 말한다 — lib/sosMessage.
 */
export function SosPanel({ guardiansHref }: { guardiansHref: string }) {
  const guardians = useGuardians()
  const sos = useSos()
  const sms = useSmsEnabled()
  const [confirm, setConfirm] = useState(false)
  const list = guardians.data ?? []
  const summary = sos.result ? sosSummary(sos.result) : null

  async function send() {
    const r = await sos.send()
    if (r) setConfirm(false)
  }

  return (
    <div className={styles.panel}>
      {sos.result && summary ? (
        <section className={styles.done} data-tone={summary.tone} role="status" aria-labelledby="sos-done">
          {summary.tone === 'ok' ? (
            <CircleCheck aria-hidden="true" size={ICON.lg} strokeWidth={ICON_STROKE} />
          ) : (
            <CircleAlert aria-hidden="true" size={ICON.lg} strokeWidth={ICON_STROKE} />
          )}
          <h2 id="sos-done" className={styles.doneTitle}>
            {summary.title}
          </h2>
          <p>{summary.note}</p>
          {sos.result.notified.length > 0 && (
            <ul className={styles.notified} aria-label="등록된 보호자">
              {sos.result.notified.map((n) => (
                <li key={n.name}>
                  {n.name}님 ({n.relation}){notifiedLabel(n) && ` · ${notifiedLabel(n)}`}
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
          <CallLink key={g.id} number={g.phone} className={styles.callRow}>
            <UserRound aria-hidden="true" size={ICON.md} strokeWidth={ICON_STROKE} />
            <span className={styles.callName}>
              {g.name} <span className={styles.callMeta}>{g.relation}</span>
            </span>
            <Phone aria-hidden="true" size={ICON.sm} strokeWidth={ICON_STROKE} />
          </CallLink>
        ))}
        <CallLink number="119" className={styles.callRow} data-tone="danger">
          <Siren aria-hidden="true" size={ICON.md} strokeWidth={ICON_STROKE} />
          <span className={styles.callName}>
            119 <span className={styles.callMeta}>응급·구급</span>
          </span>
          <Phone aria-hidden="true" size={ICON.sm} strokeWidth={ICON_STROKE} />
        </CallLink>
        <CallLink number="109" className={styles.callRow}>
          <HeartHandshake aria-hidden="true" size={ICON.md} strokeWidth={ICON_STROKE} />
          <span className={styles.callName}>
            109 <span className={styles.callMeta}>마음 상담</span>
          </span>
          <Phone aria-hidden="true" size={ICON.sm} strokeWidth={ICON_STROKE} />
        </CallLink>
        {guardians.data && list.length === 0 && (
          <Link to={guardiansHref} className={styles.addLink}>
            보호자 등록하기
          </Link>
        )}
      </section>

      <Sheet
        open={confirm}
        title={sms ? '보호자에게 문자로 알릴까요?' : '도움 요청을 기록할까요?'}
        onClose={() => setConfirm(false)}
      >
        <p>
          {sms
            ? '아래 보호자에게 바로 문자를 보내요. 급하면 직접 전화도 해 주세요.'
            : '자동 알림은 아직 보내지 않아요. 급하면 직접 전화해 주세요.'}
        </p>
        {list.length > 0 ? (
          <ul className={styles.notified}>
            {list.map((g) => (
              <li key={g.id}>
                {g.name}님 ({g.relation})
              </li>
            ))}
          </ul>
        ) : (
          <p>보호자가 아직 없어요. 급하면 아래 119나 109로 바로 전화해 주세요.</p>
        )}
        {sos.error && <Alert>{sos.error}</Alert>}
        {list.length > 0 && (
          <Button variant="danger" block large disabled={sos.pending} onClick={() => void send()}>
            {sos.pending ? (sms ? '보내는 중…' : '기록하는 중…') : sms ? '문자로 알리기' : '도움 요청 기록하기'}
          </Button>
        )}
      </Sheet>
    </div>
  )
}

/** 다른 화면(말동무 위기 안내 등)에 붙이는 보호자 알림 버튼 — 결과는 서버가 한 일 그대로. */
export function NotifyGuardianButton() {
  const sos = useSos()
  const sms = useSmsEnabled()
  async function send() {
    const r = await sos.send()
    if (!r) return toast('요청을 보내지 못했어요. 바로 전화해 주세요.', 'error')
    const s = sosSummary(r)
    toast(s.title, s.tone === 'ok' ? 'success' : 'info')
  }
  if (sos.result)
    return (
      <p className={styles.sentNote} role="status">
        <CircleCheck aria-hidden="true" size={ICON.inline} strokeWidth={ICON_STROKE} />{' '}
        {sosSummary(sos.result).title}
      </p>
    )
  return (
    <Button variant="secondary" block disabled={sos.pending} onClick={() => void send()}>
      {sms ? '보호자에게 문자로 알리기' : '도움 요청 기록하기'}
    </Button>
  )
}
