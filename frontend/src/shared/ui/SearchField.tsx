import { useId } from 'react'
import styles from './SearchField.module.css'

interface Props {
  label: string
  placeholder: string
  value: string
  onChange: (value: string) => void
}

export function SearchField({ label, placeholder, value, onChange }: Props) {
  const id = useId()
  return (
    <label htmlFor={id} className={styles.field}>
      <span>{label}</span>
      <input
        id={id}
        type="search"
        value={value}
        maxLength={50}
        placeholder={placeholder}
        autoComplete="off"
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  )
}
