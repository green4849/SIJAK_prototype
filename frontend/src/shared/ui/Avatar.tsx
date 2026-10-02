import styles from './Avatar.module.css'

interface Props {
  name: string
  /** 색을 고정하기 위한 키 (보통 사용자 id) */
  seed?: string
  /**
   * 역할별 크기 (디자인 리뷰 공통 16) — 글자 크기 설정과 무관하게 고정
   *  bubble 40 · header 48 · list 56 · profile 72
   */
  size?: AvatarSize
}

export type AvatarSize = 'bubble' | 'header' | 'list' | 'profile'

const TONES = ['pink', 'mint', 'yellow', 'sky', 'beige'] as const

function hash(s: string) {
  let h = 0
  for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return h
}

/** 사진 대신 이름으로 만든 아바타. 3글자 이름이면 이름 두 글자(예: 김영희 → 영희) */
export function Avatar({ name, seed, size = 'list' }: Props) {
  const label = name.length === 3 ? name.slice(1) : name.slice(0, 2)
  const tone = TONES[hash(seed ?? name) % TONES.length]
  return (
    <span className={styles.avatar} data-size={size} data-tone={tone} aria-hidden="true">
      {label}
    </span>
  )
}
