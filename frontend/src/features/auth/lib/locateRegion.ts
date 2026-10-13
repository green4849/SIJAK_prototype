/**
 * 위치(위도·경도) → 사는 곳(시·도 코드) + 화면에 보여 줄 동네 이름.
 *
 * 1) OpenStreetMap Nominatim 역지오코딩(무료, 키 없음)으로 "경기도 수원시 영통구 매탄동" 같은 주소를 받고
 * 2) 실패하면(오프라인·차단·느림) 시·도 중심점에서 가장 가까운 곳으로 어림한다.
 * 서버에는 시·도 코드만 보낸다 — 동네 이름은 확인용으로 화면에만 쓴다.
 */

/** 시·도 대략 중심 (위도, 경도) — 역지오코딩이 안 될 때만 쓰는 어림값 */
const CENTERS: Record<string, [number, number]> = {
  '11': [37.5665, 126.978], // 서울
  '26': [35.1796, 129.0756], // 부산
  '27': [35.8714, 128.6014], // 대구
  '28': [37.4563, 126.7052], // 인천
  '29': [35.1595, 126.8526], // 광주
  '30': [36.3504, 127.3845], // 대전
  '31': [35.5384, 129.3114], // 울산
  '36': [36.48, 127.289], // 세종
  '41': [37.35, 127.2], // 경기
  '43': [36.8, 127.7], // 충북
  '44': [36.5184, 126.8], // 충남
  '46': [34.8679, 126.991], // 전남
  '47': [36.4919, 128.8889], // 경북
  '48': [35.4606, 128.2132], // 경남
  '50': [33.4996, 126.5312], // 제주
  '51': [37.8228, 128.1555], // 강원
  '52': [35.7175, 127.153], // 전북
}

function nearestRegion(lat: number, lng: number): string {
  let best = '11'
  let bestD = Infinity
  for (const [code, [la, ln]] of Object.entries(CENTERS)) {
    const d = (la - lat) ** 2 + ((ln - lng) * Math.cos((lat * Math.PI) / 180)) ** 2
    if (d < bestD) {
      bestD = d
      best = code
    }
  }
  return best
}

export interface LocatedRegion {
  code: string
  /** 시·도 아래 동네 이름 (예: "수원시 영통구 매탄동") — 모르면 빈 문자열 */
  area: string
}

interface NominatimAddress {
  state?: string
  province?: string
  city?: string
  county?: string
  borough?: string
  city_district?: string
  suburb?: string
  quarter?: string
  town?: string
  village?: string
}

export async function locateRegion(
  lat: number,
  lng: number,
  regions: { code: string; label: string }[],
): Promise<LocatedRegion> {
  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 5000)
    const url =
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=16&accept-language=ko` +
      `&lat=${lat.toFixed(4)}&lon=${lng.toFixed(4)}`
    const res = await fetch(url, { signal: ctrl.signal })
    clearTimeout(timer)
    if (res.ok) {
      const a: NominatimAddress = (await res.json()).address ?? {}
      const stateName = a.state ?? a.province ?? a.city ?? ''
      // "서울" / "서울특별시" 어느 쪽이 와도 맞도록 앞 두 글자로 비교
      const hit = regions.find((r) => stateName && r.label.startsWith(stateName.slice(0, 2)))
      if (hit) {
        const parts = [a.city, a.county, a.borough ?? a.city_district, a.suburb ?? a.quarter ?? a.town ?? a.village]
        const area = [...new Set(parts.filter((p): p is string => !!p && p !== stateName))].join(' ')
        return { code: hit.code, area }
      }
    }
  } catch {
    // 아래 어림값으로
  }
  return { code: nearestRegion(lat, lng), area: '' }
}
