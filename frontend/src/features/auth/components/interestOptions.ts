import {
  BookOpen,
  CookingPot,
  Dumbbell,
  Footprints,
  Grid3x3,
  HandHeart,
  Images,
  Luggage,
  Music,
  Scissors,
  Sprout,
  Tv,
  type LucideIcon,
} from 'lucide-react'
import type { ImageOption, OptionTone } from '@/shared/ui/ImageOptionGrid'

/**
 * 관심사(INTERESTS 코드)별 대표 사진 — 시연용 실사 사진.
 *
 * activityPhotos 와 같은 방식: Unsplash 무료 사진(Unsplash License)을 CDN 주소로 바로 불러온다.
 * 사진을 못 불러오면 아이콘 + 파스텔 바탕으로 대신 보인다.
 * 사진을 바꾸려면 photo(…photo- 뒤 부분)만 바꾸면 된다.
 */
const LOOK: Record<string, { photo: string; icon: LucideIcon; tone: OptionTone }> = {
  walking: { photo: '1671530725345-cc4a2cf5db04', icon: Footprints, tone: 'mint' }, // 공원을 함께 걷는 두 사람
  music: { photo: '1785225484906-56a45c2a5beb', icon: Music, tone: 'pink' }, // 함께 노래하는 어르신들
  cooking: { photo: '1785735364482-0979a960c625', icon: CookingPot, tone: 'yellow' }, // 김이 나는 국 한 그릇
  gardening: { photo: '1688176939869-27718ebf6ad9', icon: Sprout, tone: 'mint' }, // 나무 상자 텃밭의 상추
  baduk: { photo: '1777652907869-97332fd656d8', icon: Grid3x3, tone: 'beige' }, // 바둑 두는 사람들
  travel: { photo: '1736080058317-84ff903cb9f6', icon: Luggage, tone: 'sky' }, // 산이 보이는 바닷가
  health: { photo: '1775338782892-315ab263fab9', icon: Dumbbell, tone: 'mint' }, // 함께 하는 태극권·스트레칭
  tv: { photo: '1528429421263-b742bf08e211', icon: Tv, tone: 'sky' }, // 소파에서 TV 보기
  reading: { photo: '1745774609395-a7621c50887f', icon: BookOpen, tone: 'sky' }, // 바깥에서 책 읽는 어르신
  crafts: { photo: '1541753866388-0b3c701627d3', icon: Scissors, tone: 'pink' }, // 그림 그리는 손
  faith: { photo: '1765146567664-cf0c0d987da9', icon: HandHeart, tone: 'yellow' }, // 나란히 켜진 촛불
  memories: { photo: '1528569937393-ee892b976859', icon: Images, tone: 'beige' }, // 흑백 사진 앨범
}

function photoUrl(id: string) {
  return `https://images.unsplash.com/photo-${id}?w=400&h=300&fit=crop&auto=format&q=70`
}

/** 서버가 준 관심사 목록 → 사진 선택지 (모르는 코드는 아이콘만) */
export function toInterestOptions(list: { code: string; label: string }[]): ImageOption[] {
  return list.map(({ code, label }) => {
    const look = LOOK[code]
    return {
      value: code,
      label,
      image: look ? photoUrl(look.photo) : null,
      icon: look?.icon ?? HandHeart,
      tone: look?.tone ?? 'beige',
    }
  })
}
