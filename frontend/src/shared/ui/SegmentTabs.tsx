import styles from './SegmentTabs.module.css'

interface Props<T extends string> {
  label: string
  tabs: { value: T; label: string }[]
  value: T
  onChange: (v: T) => void
}

/** 시안 ④·⑥의 알약형 탭 (추천 친구 / 같은 동네, 전체 / 문화·여가 …) */
export function SegmentTabs<T extends string>({ label, tabs, value, onChange }: Props<T>) {
  return (
    <div role="tablist" aria-label={label} className={styles.tabs}>
      {tabs.map((t) => (
        <button
          key={t.value}
          type="button"
          role="tab"
          aria-selected={t.value === value}
          className={styles.tab}
          onClick={() => onChange(t.value)}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}
