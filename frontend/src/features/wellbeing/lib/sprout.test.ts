import { describe, expect, it } from 'vitest'
import { sproutChange, sproutShade } from './sprout'

describe('마음 새싹', () => {
  it('점수가 높을수록 진한 단계 — WHO-5 단계 경계와 같게', () => {
    expect([0, 28, 29, 50, 51, 65, 66, 80, 81, 100].map(sproutShade)).toEqual([1, 1, 2, 2, 3, 3, 4, 4, 5, 5])
  })
  it('지난번과 비교는 짧게, 처음이면 없음', () => {
    expect(sproutChange(68, 62)).toEqual({ dir: 'up', text: '지난번보다 6점 ↑' })
    expect(sproutChange(60, 68)?.dir).toBe('down')
    expect(sproutChange(60, 60)?.text).toBe('지난번과 같아요')
    expect(sproutChange(60, null)).toBeNull()
  })
})
