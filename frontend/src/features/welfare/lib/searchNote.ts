import type { WelfareSearch } from '../api/welfareApi'

/**
 * 목록 위 한 줄 — 서버가 어떻게 찾았는지(mode) 그대로 말한다.
 * '없어요'가 '근처에만 없음'인지 '정보가 아예 없음'인지 헷갈리지 않게.
 */
export function searchNote(r: Pick<WelfareSearch, 'mode' | 'radius_km'>, filtered: boolean): string | null {
  switch (r.mode) {
    case 'near':
      return null
    case 'wider':
      return `5km 안에는 없어서 ${r.radius_km}km 안을 보여 드려요.`
    case 'nearest':
      return '20km 안에는 없어서 가장 가까운 곳을 보여 드려요.'
    case 'region':
      return '내 위치를 몰라서 사시는 시·도의 시설을 보여 드려요.'
    case 'empty':
      return filtered ? '이런 시설은 아직 정보가 없어요. ‘전체’를 눌러 보세요.' : '아직 이 지역의 복지시설 정보가 없어요.'
  }
}
