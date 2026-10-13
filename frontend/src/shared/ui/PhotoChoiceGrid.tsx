import { Check } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import styles from './PhotoChoiceGrid.module.css'

export interface PhotoChoice {
  value: string
  label: string
  /** 그림(일러스트) — 있으면 사진 대신 이것을 둥글게 보여 준다 */
  art?: ReactNode
  /** 사진 주소. 없거나 못 불러오면 연한 바탕만 (이름은 아래 글자로 이미 보인다) */
  image?: string | null
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
 * 둥근 그림·사진으로 고르는 선택지 (여러 개) — 3열이라 12개가 한 화면 남짓에 들어온다 (A24 시안 C).
 * 선택은 색만이 아니라 사진 둘레 녹색 고리 + ✓ + aria-pressed 로 전달한다.
 * 사진은 꾸밈이라 읽지 않고, 버튼 이름은 아래 글자 그대로다.
 * 사진을 못 불러오면 대신 그림을 넣지 않고 연한 바탕만 둔다 — 어설픈 아이콘보다 조용한 빈칸이 낫다 (A24).
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

/** 그림이 있으면 그림, 없으면 사진 — 사진을 불러오는 동안·실패하면 연한 바탕만 */
function Photo({ option }: { option: PhotoChoice }) {
  const [failed, setFailed] = useState(false)
  return (
    <span className={styles.photo} aria-hidden="true">
      {option.art}
      {!option.art && option.image && !failed && (
        <img src={option.image} alt="" loading="lazy" decoding="async" onError={() => setFailed(true)} />
      )}
    </span>
  )
}
