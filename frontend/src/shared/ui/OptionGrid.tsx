import styles from './OptionGrid.module.css'

export interface GridOption {
  value: string
  label: string
}

interface Props {
  legend: string
  hint?: string
  options: GridOption[]
  selected: string[]
  onToggle: (value: string) => void
  /** 한 줄에 몇 칸 (기본 2) */
  columns?: 1 | 2 | 3
  multiple?: boolean
}

/**
 * 큰 버튼으로 고르는 선택지. 라디오/체크박스보다 시니어가 누르기 쉽다.
 * 선택 상태는 색만이 아니라 ✓ 표시 + aria-pressed 로도 전달한다.
 */
export function OptionGrid({
  legend,
  hint,
  options,
  selected,
  onToggle,
  columns = 2,
  multiple = false,
}: Props) {
  return (
    <fieldset className={styles.fieldset}>
      <legend className={styles.legend}>{legend}</legend>
      {hint && <p className={styles.hint}>{hint}</p>}
      <div className={styles.grid} data-columns={columns} role={multiple ? 'group' : 'radiogroup'}>
        {options.map((o) => {
          const on = selected.includes(o.value)
          return (
            <button
              key={o.value}
              type="button"
              className={styles.option}
              data-selected={on}
              {...(multiple ? { 'aria-pressed': on } : { role: 'radio', 'aria-checked': on })}
              onClick={() => onToggle(o.value)}
            >
              {on && (
                <span aria-hidden="true" className={styles.check}>
                  ✓
                </span>
              )}
              {o.label}
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}
