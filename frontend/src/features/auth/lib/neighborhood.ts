/** 상세 주소를 받지 않고 행정구역 이름까지만 입력받는다. */
export function neighborhoodName(value: string, regionCode: string): string | null {
  const name = value.trim().replace(/\s+/g, ' ')
  const parts = name.split(' ')
  if (!/^[가-힣0-9 ]{2,50}$/.test(name)) return null
  if (regionCode !== '36' && parts.length < 2) return null // 세종시는 시·군·구가 없다
  if (!/[읍면동리]$/.test(parts.at(-1) ?? '')) return null
  if (parts.some((part) => /^(?:\d+|.*(?:번지|아파트|빌라|호))$/.test(part))) return null
  return name
}

/** 역지오코딩 결과는 동네까지 나오지 않을 수 있다. 안전한 행정구역 이름만 저장한다. */
export function foundAreaName(value: string): string | null {
  const name = value.trim().replace(/\s+/g, ' ')
  return /^[가-힣0-9 ]{2,50}$/.test(name) && /[시군구읍면동리]$/.test(name) ? name : null
}
