import { describe, expect, it } from 'vitest'
import { searchNote } from './searchNote'

describe('searchNote — 어떻게 찾았는지 그대로', () => {
  it('5km 안이면 덧붙일 말 없음, 넓혔으면 몇 km 안인지', () => {
    expect(searchNote({ mode: 'near', radius_km: 5 }, false)).toBeNull()
    expect(searchNote({ mode: 'wider', radius_km: 10 }, false)).toBe('5km 안에는 없어서 10km 안을 보여 드려요.')
  })
  it('20km 밖이면 가장 가까운 곳, 위치를 모르면 시·도', () => {
    expect(searchNote({ mode: 'nearest', radius_km: null }, false)).toContain('가장 가까운 곳')
    expect(searchNote({ mode: 'region', radius_km: null }, false)).toContain('시·도')
  })
  it('없을 때 — 종류를 걸렀으면 전체를 권하고, 아니면 정보가 없다고', () => {
    expect(searchNote({ mode: 'empty', radius_km: null }, true)).toContain('‘전체’')
    expect(searchNote({ mode: 'empty', radius_km: null }, false)).toBe('아직 이 지역의 복지시설 정보가 없어요.')
  })
})
