import { useId, type TextareaHTMLAttributes } from 'react'
import styles from './TextField.module.css'

interface Props extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'id'> {
  label: string
  hint?: string
}

/** 여러 줄 입력 — 글자 수 제한이 있으면 남은 글자를 함께 보여 준다 */
export function TextArea({ label, hint, className, maxLength, value, ...rest }: Props) {
  const id = useId()
  const hintId = `${id}-hint`
  const count = typeof value === 'string' ? value.length : 0
  return (
    <div className={[styles.field, className].filter(Boolean).join(' ')}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      {(hint || maxLength) && (
        <p id={hintId} className={styles.hint}>
          {hint}
          {maxLength ? ` (${count}/${maxLength}자)` : ''}
        </p>
      )}
      <textarea
        id={id}
        aria-describedby={hint || maxLength ? hintId : undefined}
        className={`${styles.input} ${styles.multiline}`}
        maxLength={maxLength}
        value={value}
        rows={3}
        {...rest}
      />
    </div>
  )
}
