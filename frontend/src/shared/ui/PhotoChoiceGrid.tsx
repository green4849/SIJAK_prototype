import { Check, type LucideIcon } from 'lucide-react'
import { useState } from 'react'
import styles from './PhotoChoiceGrid.module.css'
import { ICON, ICON_STROKE } from './icon'

export type ChoiceTone = 'pink' | 'mint' | 'yellow' | 'sky' | 'beige'

export interface PhotoChoice {
  value: string
  label: string
  /** 사진 주소. 없거나 못 불러오면 아이콘 + 파스텔 바탕 */
  image?: string | null
  icon: LucideIcon
  tone?: ChoiceTone
}

interface Props {
  /** 묶음 이름 — 화면 제목이 같은 질문을 하고 있으면 숨겨서 화면 읽기용으로만 */
  legend: string
  legendHidden?: boolean
  options: PhotoChoice[]
  selected: string[]
  onToggle: (value: string) => void
}

/**
 * 둥근 사진으로 고르는 선택지 (여러 개) — 3열이라 12개가 한 화면 남짓에 들어온다 (A23 시안 C).
 * 선택은 색만이 아니라 사진 둘레 녹색 고리 + ✓ + aria-pressed 로 전달한다.
 * 사진은 꾸밈이라 읽지 않고, 버튼 이름은 아래 글자 그대로다.
 */
export function PhotoChoiceGrid({ legend, legendHidden = false, options, selected, onToggle }: Props) {
  return (
    <fieldset className={styles.fieldset}>
      <legend className={legendHidden ? 'sr-only' : styles.legend}>{legend}</legend>
      <div className={styles.grid} role="group">
        {options.map((o) => {
          const on = selected.includes(o.value)
          return (
            <button
              key={o.value}
              type="button"
              className={styles.choice}
              aria-pressed={on}
              onClick={() => onToggle(o.value)}
            >
              <span className={styles.ring}>
                <Photo option={o} />
                {on && (
                  <span className={styles.check} aria-hidden="true">
                    <Check size={18} strokeWidth={3.2} />
                  </span>
                )}
              </span>
              <span className={styles.label}>{o.label}</span>
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}

/** 불러오는 동안·실패하면 아이콘이 보인다 */
function Photo({ option }: { option: PhotoChoice }) {
  const [failed, setFailed] = useState(false)
  const Icon = option.icon
  return (
    <span className={styles.photo} data-tone={option.tone ?? 'beige'} aria-hidden="true">
      <Icon size={ICON.md + 6} strokeWidth={ICON_STROKE} />
      {option.image && !failed && (
        <img src={option.image} alt="" loading="lazy" decoding="async" onError={() => setFailed(true)} />
      )}
    </span>
  )
}
