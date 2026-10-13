/** 인물 일러스트의 모습 정하기 (A19) — 컴포넌트 파일과 분리 (fast refresh 규칙) */

export type Gender = 'M' | 'F'
export type Cloth = 'pink' | 'yellow' | 'green' | 'sky'

export interface SeniorLook {
  gender?: Gender
  /** 머리 모양 0~2 */
  hair: number
  glasses: boolean
  cloth: Cloth
}

function hash(s: string) {
  let h = 0
  for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return h
}

const CLOTHES: Cloth[] = ['pink', 'yellow', 'green', 'sky']

/** 같은 사람은 늘 같은 모습 (id 로 고정) */
export function lookFor(seed: string, gender?: Gender): SeniorLook {
  const h = hash(seed)
  return { gender, hair: h % 3, glasses: ((h >>> 3) & 1) === 1, cloth: CLOTHES[(h >>> 5) % CLOTHES.length] }
}
