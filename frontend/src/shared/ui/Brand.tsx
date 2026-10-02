import styles from './Brand.module.css'

/** 새싹 로고 (원본 일러스트 아님 — 자체 제작 도형) */
export function LeafLogo({ size = '1em' }: { size?: string }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true" className={styles.leaf}>
      <path d="M32 56V30" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
      <path d="M32 33c-2-11-11-18-22-17 0 11 9 19 22 17z" className={styles.leafLight} />
      <path d="M32 31c1-12 10-20 23-20 1 12-9 21-23 20z" fill="currentColor" />
    </svg>
  )
}

interface Props {
  size?: 'md' | 'hero'
  tagline?: string
  /** 큰 로고가 따로 있는 화면에서는 끈다 */
  leaf?: boolean
}

/** 서비스 이름 '시작' + 새싹 */
export function Brand({ size = 'md', tagline, leaf = true }: Props) {
  return (
    <div className={styles.brand} data-size={size}>
      <p className={styles.word}>
        {leaf && <LeafLogo size="0.8em" />}
        시작
      </p>
      {tagline && <p className={styles.tagline}>{tagline}</p>}
    </div>
  )
}
