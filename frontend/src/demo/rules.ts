/** backend/app/domains/risk/rules.py 의 사본 — 위험 대화 1단계 키워드 룰 */

const RULES: [code: string, label: string, level: number, patterns: RegExp[]][] = [
  [
    'money',
    '돈·송금 이야기',
    2,
    [/송금/, /계좌/, /이체/, /입금/, /돈\s*(좀|을|이)?\s*(빌려|보내|부쳐)/, /빌려\s*줘/, /대출/,
     /투자/, /수익/, /코인/, /상품권/, /기프트\s*카드/, /선물\s*카드/],
  ],
  [
    'personal_info',
    '비밀번호·인증번호 같은 개인정보',
    3,
    [/비밀\s*번호/, /\bOTP\b/i, /인증\s*번호/, /주민\s*(등록)?\s*번호/, /카드\s*번호/, /보안\s*카드/,
     /공인\s*인증서/, /신분증\s*(사진|찍어)/],
  ],
  ['urgency', '급하게 서두르게 하는 말', 1, [/급해/, /긴급/, /지금\s*당장/, /병원비/, /사고\s*(났|가)/, /아무한테도\s*말하지/]],
  ['off_platform', '다른 앱이나 링크로 옮기자는 말', 1, [/카톡\s*(아이디|ID)/i, /텔레그램/, /라인\s*아이디/, /https?:\/\//, /\bbit\.ly\b/]],
]

export function assessText(text: string): { level: number; labels: string[] } {
  const codes: string[] = []
  const labels: string[] = []
  let level = 0
  for (const [code, label, lvl, patterns] of RULES) {
    if (patterns.some((p) => p.test(text))) {
      codes.push(code)
      labels.push(label)
      level = Math.max(level, lvl)
    }
  }
  if (codes.includes('money') && codes.includes('urgency')) level = Math.min(3, level + 1)
  return { level, labels }
}

// ---------- 같은 동네 반경 검색 — backend/app/domains/friend/nearby.py 의 사본 (C3) ----------

export const NEARBY_RADIUS_KM = 2
/** 추천 친구 탭 후보 반경 — backend friend/nearby.py RECOMMEND_RADIUS_KM */
export const RECOMMEND_RADIUS_KM = 5

export function haversineKm([lat1, lng1]: [number, number], [lat2, lng2]: [number, number]) {
  const r = (d: number) => (d * Math.PI) / 180
  const a =
    Math.sin(r(lat2 - lat1) / 2) ** 2 + Math.cos(r(lat1)) * Math.cos(r(lat2)) * Math.sin(r(lng2 - lng1) / 2) ** 2
  return 2 * 6371.0088 * Math.asin(Math.sqrt(a))
}

/** 0.5km 단위 반올림 (0은 0.5로) */
export const coarseKm = (km: number) => Math.max(0.5, Math.round(km / 0.5) * 0.5)

/**
 * 내 위치가 없으면 같은 시·도(거리 없음). 있으면 반경 안을 가까운 순 + 위치를 안 알린 같은 시·도를 뒤에
 */
export function findNearby<U extends { geo: [number, number] | null; region_code: string }>(
  me: U,
  pool: U[],
): [U, number | null][] {
  const sameRegion = pool.filter((u) => u.region_code === me.region_code)
  if (!me.geo) return sameRegion.map((u) => [u, null])
  const myGeo = me.geo
  const within = pool
    .filter((u) => u.geo)
    .map((u) => [u, haversineKm(myGeo, u.geo!)] as const)
    .filter(([, km]) => km <= NEARBY_RADIUS_KM)
    .sort((a, b) => a[1] - b[1])
    .map(([u, km]) => [u, coarseKm(km)] as [U, number])
  return [...within, ...sameRegion.filter((u) => !u.geo).map((u) => [u, null] as [U, null])]
}

/** 추천 친구 탭 후보 (성향조사 알고리즘 1단계) — 둘 다 위치가 있으면 5km 안, 아니면 같은 시·도 */
export function withinReach<U extends { geo: [number, number] | null; region_code: string }>(
  me: U,
  pool: U[],
): [U, number | null][] {
  const out: [U, number | null][] = []
  for (const u of pool) {
    if (me.geo && u.geo) {
      const km = haversineKm(me.geo, u.geo)
      if (km <= RECOMMEND_RADIUS_KM) out.push([u, coarseKm(km)])
    } else if (u.region_code === me.region_code) out.push([u, null])
  }
  return out
}

// ---------- 대화 주제 추천 — backend/app/domains/chat/topics.py 의 사본 (C12) ----------

const PHRASES: Record<string, [string, string]> = {
  walking: ['자주 가시는 산책길이 있으세요?', '날 좋은 날 같이 천천히 걸으실래요?'],
  movies: ['요즘 재미있게 보신 영화가 있으세요?', '다음에 공연 같이 보러 가실래요?'],
  cooking: ['요즘 자주 해 드시는 음식이 있으세요?', '동네에 맛있는 집 아시는 데 있으세요?'],
  fishing: ['낚시는 주로 어디로 가세요?', '제일 크게 잡으신 게 뭐였어요?'],
  reading: ['요즘 읽고 계신 책이 있으세요?', '신문은 어떤 걸 보세요?'],
  finance: ['요즘 경제 소식 중에 눈여겨보시는 게 있으세요?', '용돈 관리는 어떻게 하세요?'],
  travel: ['가 보신 곳 중에 제일 좋았던 데가 어디세요?', '가까운 데 바람 쐬러 가실래요?'],
  health: ['요즘 건강 챙기시려고 하시는 운동 있으세요?', '아침에 체조 같은 거 하세요?'],
  gardening: ['요즘 키우시는 꽃이나 화분이 있으세요?', '텃밭에 뭐 심으셨어요?'],
  volunteer: ['봉사는 주로 어디서 하세요?', '다음에 봉사 같이 가 보실래요?'],
}
const GENERAL = ['오늘 점심은 뭐 드셨어요?', '이번 주 날씨가 좋다던데, 어떻게 지내세요?', '요즘 즐거운 일 있으셨어요?']
const MAX_TOPICS = 4

export function suggestTopics(
  mine: string[],
  theirs: string[],
  labelOf: (code: string) => string,
): { label: string; text: string; common: boolean }[] {
  const common = theirs.filter((c) => mine.includes(c))
  const only = theirs.filter((c) => !mine.includes(c))
  const out: { label: string; text: string; common: boolean }[] = []
  for (const round of [0, 1])
    for (const [cats, isCommon] of [[common, true], [only, false]] as const)
      for (const c of cats) {
        const p = PHRASES[c]
        if (p) out.push({ label: labelOf(c), text: p[round], common: isCommon })
      }
  out.push(...GENERAL.map((text) => ({ label: '일상', text, common: false })))
  return out.slice(0, MAX_TOPICS)
}
