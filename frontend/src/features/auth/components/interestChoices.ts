import type { PhotoChoice } from '@/shared/ui/PhotoChoiceGrid'

/**
 * 관심사(INTERESTS 코드)별 대표 사진 — 시연용 실사 사진 (A23).
 *
 * activityPhotos(A20)와 같은 방식: Unsplash 무료 사진(Unsplash License)을 CDN 주소로 바로 불러온다.
 * 사진을 못 불러오면 연한 바탕만 보인다 (대신 그림은 넣지 않음).
 * 사진을 바꾸려면 아래 id(photo- 뒤 부분)만 바꾸면 된다.
 * 사진은 설명(alt) 기준으로 골랐다 — 화면에서 확인하고 어색하면 교체.
 */
const PHOTO_IDS: Record<string, string> = {
  walking: '1671530725345-cc4a2cf5db04', // 공원을 함께 걷는 두 사람
  music: '1785225484906-56a45c2a5beb', // 함께 노래하는 어르신들
  cooking: '1785735364482-0979a960c625', // 김이 나는 국 한 그릇
  gardening: '1688176939869-27718ebf6ad9', // 나무 상자 텃밭의 상추
  baduk: '1777652907869-97332fd656d8', // 바둑 두는 사람들
  travel: '1736080058317-84ff903cb9f6', // 산이 보이는 바닷가
  health: '1775338782892-315ab263fab9', // 함께 하는 태극권·스트레칭
  tv: '1528429421263-b742bf08e211', // 소파에서 TV 보기
  reading: '1745774609395-a7621c50887f', // 바깥에서 책 읽는 어르신
  crafts: '1541753866388-0b3c701627d3', // 그림 그리는 손
  faith: '1765146567664-cf0c0d987da9', // 나란히 켜진 촛불
  memories: '1528569937393-ee892b976859', // 흑백 사진 앨범
}

/** 둥근 사진 지름(최대 104px)의 2배 정도로 잘라 받는다 */
function photoUrl(id: string) {
  return `https://images.unsplash.com/photo-${id}?w=240&h=240&fit=crop&auto=format&q=70`
}

/** 서버가 준 관심사 목록 → 사진 선택지 (모르는 코드는 바탕만) */
export function toInterestChoices(list: { code: string; label: string }[]): PhotoChoice[] {
  return list.map(({ code, label }) => {
    const id = PHOTO_IDS[code]
    return { value: code, label, image: id ? photoUrl(id) : null }
  })
}
