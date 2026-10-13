import { lookFor, type Gender } from './illustrations/look'
import { SeniorFigure } from './illustrations/Senior'
import styles from './Avatar.module.css'

interface Props {
  name: string
  /** 모습·색을 고정하기 위한 키 (보통 사용자 id) */
  seed?: string
  /** 할머니·할아버지 그림 구분 — 모르면 짧은 머리 */
  gender?: Gender
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

/**
 * 사진 대신 시니어 얼굴 일러스트 (A19 — 처음 시안의 인물 그림체).
 * 같은 사람은 늘 같은 머리·안경·옷. 이름은 화면에 글자로 따로 있으므로 그림은 장식(aria-hidden).
 */
export function Avatar({ name, seed, gender, size = 'list' }: Props) {
  const key = seed ?? name
  const tone = TONES[hash(key) % TONES.length]
  return (
    <span className={styles.avatar} data-size={size} data-tone={tone} aria-hidden="true">
      <svg viewBox="0 2 64 64" className={styles.face}>
        <SeniorFigure look={lookFor(key, gender)} />
      </svg>
    </span>
  )
}
