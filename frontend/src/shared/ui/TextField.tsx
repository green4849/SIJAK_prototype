import { useId, type InputHTMLAttributes } from 'react'
import styles from './TextField.module.css'

interface Props extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> {
  label: string
  hint?: string
}

/** 큰 라벨이 항상 보이는 입력칸 (placeholder만으로 안내하지 않는다) */
export function TextField({ label, hint, className, ...rest }: Props) {
  const id = useId()
  const hintId = hint ? `${id}-hint` : undefined
  return (
    <div className={[styles.field, className].filter(Boolean).join(' ')}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      {hint && (
        <p id={hintId} className={styles.hint}>
          {hint}
        </p>
      )}
      <input id={id} aria-describedby={hintId} className={styles.input} {...rest} />
    </div>
  )
}
