import { Check, type LucideIcon } from 'lucide-react'
import { useState } from 'react'
import styles from './ImageOptionGrid.module.css'
import { ICON, ICON_STROKE } from './icon'

export type OptionTone = 'pink' | 'mint' | 'yellow' | 'sky' | 'beige'

export interface ImageOption {
  value: string
  label: string
  /** 사진 주소. 없거나 못 불러오면 아이콘을 보여 준다 */
  image?: string | null
  icon: LucideIcon
  tone?: OptionTone
}

interface Props {
  /** 화면 읽기 프로그램용 묶음 이름 (화면 제목이 따로 있으면 숨겨서 쓴다) */
  legend: string
  legendHidden?: boolean
  options: ImageOption[]
  selected: string[]
  onToggle: (value: string) => void
  multiple?: boolean
}

/**
 * 사진으로 고르는 선택지 — 글자만 있는 버튼보다 한눈에 알아보기 쉽다 (취미 고르기 등).
 * 선택 상태는 테두리 색만이 아니라 ✓ 동그라미 + aria-pressed 로도 전달한다.
 * 사진은 꾸밈이라 읽지 않고, 버튼 이름은 아래 글자 그대로다.
 */
export function ImageOptionGrid({
  legend,
  legendHidden = false,
  options,
  selected,
  onToggle,
  multiple = false,
}: Props) {
  return (
    <fieldset className={styles.fieldset}>
      <legend className={legendHidden ? 'sr-only' : styles.legend}>{legend}</legend>
      <div className={styles.grid} role={multiple ? 'group' : 'radiogroup'}>
        {options.map((o) => {
          const on = selected.includes(o.value)
          return (
            <button
              key={o.value}
              type="button"
              className={styles.card}
              data-selected={on}
              {...(multiple ? { 'aria-pressed': on } : { role: 'radio', 'aria-checked': on })}
              onClick={() => onToggle(o.value)}
            >
              <Media option={o} />
              <span className={styles.label}>{o.label}</span>
              {on && (
                <span className={styles.badge} aria-hidden="true">
                  <Check size={ICON.sm} strokeWidth={3} />
                </span>
              )}
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}

/** 사진 자리 — 불러오는 동안·실패하면 아이콘이 보인다 */
function Media({ option }: { option: ImageOption }) {
  const [failed, setFailed] = useState(false)
  const Icon = option.icon
  return (
    <span className={styles.media} data-tone={option.tone ?? 'beige'} aria-hidden="true">
      <Icon size={ICON.lg - 16} strokeWidth={ICON_STROKE} />
      {option.image && !failed && (
        <img
          className={styles.photo}
          src={option.image}
          alt=""
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
        />
      )}
    </span>
  )
}
