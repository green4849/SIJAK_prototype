/**
 * 활동 종류(image_kind)별 대표 사진 — 시연용 실사 사진.
 *
 * 실제 서비스에서는 복지관·주민센터가 올린 활동 사진을 쓰고,
 * 프로토타입에서는 Unsplash 무료 사진(Unsplash License: 상업·비상업 무료, 출처 표기 선택)을
 * CDN 주소로 바로 불러온다. API 키는 필요 없다.
 * 사진을 못 불러오면 ActivityThumb 가 종류별 아이콘으로 대신 보여 준다.
 *
 * 사진을 바꾸려면 아래 id(photo-… 뒤 부분)만 바꾸면 된다.
 */
const PHOTO_IDS: Record<string, string> = {
  walk: '1671530725345-cc4a2cf5db04', // 공원을 함께 걷는 두 사람
  phone: '1758686253992-62c9c69dfe61', // 함께 스마트폰을 보는 어르신 부부
  movie: '1485095329183-d0797cdc5676', // 어두운 상영관과 관객석
  tea: '1674749232554-2ac15ced3954', // 쟁반 위 다기와 찻잔
  music: '1785225484906-56a45c2a5beb', // 악보를 보며 함께 노래하는 어르신들
  craft: '1541753866388-0b3c701627d3', // 그림 그리는 손
  exercise: '1775338782892-315ab263fab9', // 실내에서 함께 하는 태극권·스트레칭
  book: '1745774609395-a7621c50887f', // 바깥에서 책 읽는 어르신
  garden: '1688176939869-27718ebf6ad9', // 나무 상자 텃밭의 상추
  meal: '1593113616828-6f22bca04804', // 음식 꾸러미를 포장하는 봉사자들
  cleanup: '1758599669406-d5179ccefcb9', // 쓰레기 봉투를 든 봉사자들
}

/** 목록(64px)·상세(전체 폭) 크기에 맞춰 잘라 받은 사진 주소 */
export function activityPhotoUrl(kind: string, size: 'md' | 'hero'): string | null {
  const id = PHOTO_IDS[kind]
  if (!id) return null
  const crop = size === 'hero' ? 'w=960&h=480' : 'w=192&h=192'
  return `https://images.unsplash.com/photo-${id}?${crop}&fit=crop&auto=format&q=70`
}
