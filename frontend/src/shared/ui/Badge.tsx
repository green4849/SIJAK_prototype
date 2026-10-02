import styles from './Badge.module.css'

interface Props {
  count: number | null | undefined
  /** 화면 낭독기용 문장 — 예: n => `안 읽은 메시지 ${n}개` */
  label: (n: number) => string
  /**
   * all  : 숫자 + 낭독 문장 (기본, 글자 바로 뒤에 붙일 때)
   * dot  : 숫자만 (아이콘 위 등 — 낭독 문장은 'text'로 이름 뒤에 따로)
   * text : 낭독 문장만
   * 낭독 순서는 항상 '이름 → 배지 문장'이어야 한다 ("친구, 새 친구 신청 1개")
   */
  part?: 'all' | 'dot' | 'text'
}

/** 숫자 배지. 0이면 그리지 않는다. 눈에는 숫자, 화면 낭독기에는 문장. */
export function Badge({ count, label, part = 'all' }: Props) {
  if (!count) return null
  const dot = (
    <span className={styles.badge} aria-hidden="true">
      {count > 99 ? '99+' : count}
    </span>
  )
  const text = <span className="sr-only">, {label(count)}</span>
  if (part === 'dot') return dot
  if (part === 'text') return text
  return (
    <>
      {dot}
      {text}
    </>
  )
}
