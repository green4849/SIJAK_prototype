import { Check, ChevronDown } from 'lucide-react'
import { useId, useState } from 'react'
import { CONSENT_ORDER, LEGAL_DOCS } from '@/shared/legal/documents'
import { LegalSummary, LegalText } from '@/shared/legal/LegalText'
import { ICON, ICON_STROKE } from '@/shared/ui/icon'
import type { ConsentDoc } from '../api/authApi'
import type { ConsentValue } from '../lib/consent'
import styles from './ConsentForm.module.css'

interface Props {
  /** 서버가 알려 준 문서(버전·필수 여부). 이 순서가 아니라 CONSENT_ORDER 순서로 보인다 */
  docs: ConsentDoc[]
  value: ConsentValue
  onChange: (next: ConsentValue) => void
}

/**
 * 약관 동의 (B6) — 큰 글씨 요약을 먼저, 전문은 '전체 내용 보기'로 펼친다.
 * 줄 전체가 누르는 곳이고, 실제 체크박스는 화면 낭독기·키보드용으로 남긴다 (A21 위치 동의와 같은 모양).
 */
export function ConsentForm({ docs, value, onChange }: Props) {
  const shown = CONSENT_ORDER.map((k) => docs.find((d) => d.kind === k)).filter((d): d is ConsentDoc => !!d)
  const all = shown.every((d) => value[d.kind])

  function setAll(on: boolean) {
    onChange(Object.fromEntries(shown.map((d) => [d.kind, on])))
  }

  return (
    <div className={styles.wrap}>
      <CheckRow
        checked={all}
        onChange={setAll}
        strong
        label="모두 동의해요"
        sub="선택 항목(마음 건강 기록)까지 함께 동의해요"
      />
      <ul className={styles.list}>
        {shown.map((d) => (
          <li key={d.kind}>
            <ConsentItem doc={d} checked={!!value[d.kind]} onChange={(on) => onChange({ ...value, [d.kind]: on })} />
          </li>
        ))}
      </ul>
    </div>
  )
}

function ConsentItem({ doc, checked, onChange }: { doc: ConsentDoc; checked: boolean; onChange: (on: boolean) => void }) {
  const legal = LEGAL_DOCS[doc.kind]
  const [open, setOpen] = useState(false)
  const panel = useId()
  return (
    <div className={styles.item} data-on={checked || undefined}>
      <CheckRow
        checked={checked}
        onChange={onChange}
        tag={doc.required ? '필수' : '선택'}
        label={legal.agreeLabel ?? legal.title}
        sub={legal.title}
      />
      <div className={styles.body}>
        <LegalSummary doc={legal} />
        <button
          type="button"
          className={styles.more}
          aria-expanded={open}
          aria-controls={panel}
          onClick={() => setOpen(!open)}
        >
          {open ? '전체 내용 접기' : '전체 내용 보기'}
          <ChevronDown aria-hidden="true" size={ICON.inline} strokeWidth={ICON_STROKE} data-open={open || undefined} />
        </button>
        <div id={panel} hidden={!open} className={styles.full}>
          <LegalText doc={legal} headingLevel={3} />
        </div>
      </div>
    </div>
  )
}

function CheckRow({
  checked,
  onChange,
  label,
  sub,
  tag,
  strong,
}: {
  checked: boolean
  onChange: (on: boolean) => void
  label: string
  sub?: string
  tag?: '필수' | '선택'
  strong?: boolean
}) {
  return (
    <label className={styles.row} data-on={checked || undefined} data-strong={strong || undefined}>
      <input type="checkbox" className={styles.input} checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className={styles.box} aria-hidden="true">
        {checked && <Check size={ICON.sm} strokeWidth={3} />}
      </span>
      <span className={styles.text}>
        <strong>
          {tag && <span className={styles.tag} data-required={tag === '필수' || undefined}>[{tag}] </span>}
          {label}
        </strong>
        {sub && <span className={styles.sub}>{sub}</span>}
      </span>
    </label>
  )
}
