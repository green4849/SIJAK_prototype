import styles from './SkeletonList.module.css'

interface Props {
  rows?: number
  label?: string
}

/** 목록 데이터가 도착하기 전, 카드 크기와 읽기 상태를 함께 보여 준다. */
export function SkeletonList({ rows = 3, label = '목록을 불러오는 중이에요.' }: Props) {
  return (
    <div role="status" aria-label={label} className={styles.list}>
      <span className="sr-only">{label}</span>
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className={styles.card} aria-hidden="true">
          <span className={styles.avatar} />
          <span className={styles.lines}>
            <span className={styles.title} />
            <span className={styles.detail} />
          </span>
        </div>
      ))}
    </div>
  )
}
