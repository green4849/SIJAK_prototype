/**
 * 마음 새싹 — WHO-5 점수(0~100)를 새싹 초록의 진하기 5단계로.
 * 진할수록 마음이 건강한 편. 빨강처럼 불안을 주는 색은 쓰지 않는다 (낮아도 '연한 새싹').
 * 단계 경계는 WHO-5 단계(백엔드 WHO5_LEVELS: ~50 지침 · ~65 보통 · 그 위 건강)와 맞춘다.
 */
export type SproutShade = 1 | 2 | 3 | 4 | 5

export function sproutShade(score: number): SproutShade {
  if (score <= 28) return 1 // WHO-5 상담 권고 구간
  if (score <= 50) return 2
  if (score <= 65) return 3
  if (score <= 80) return 4
  return 5
}

/** 지난번과 비교 — '↑6' 처럼 짧게 (처음이면 null) */
export function sproutChange(score: number, previous: number | null | undefined): { dir: 'up' | 'down' | 'same'; text: string } | null {
  if (previous == null) return null
  const d = score - previous
  if (d > 0) return { dir: 'up', text: `지난번보다 ${d}점 ↑` }
  if (d < 0) return { dir: 'down', text: `지난번보다 ${-d}점 ↓` }
  return { dir: 'same', text: '지난번과 같아요' }
}
