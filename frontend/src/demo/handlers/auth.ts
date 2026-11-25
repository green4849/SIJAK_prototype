/** backend/app/domains/auth 와 같은 계약 */
import { CONSENT_DOCS, CONSENT_VERSIONS, DEMO_HOME, INTERESTS, INTRO_MAX_LEN, MAX_INTERESTS, REGIONS } from '../constants'
import { fail, json, noContent, type DemoRequest, type Route } from '../http'
import { ageOf, db, DEMO_ME_ID, newId, save, type DUser, regionLabel } from '../store'
import type { Schema } from '@/shared/api/types'

const verifySessions = new Map<string, { name: string; birth_date: string; phone: string; gender: 'M' | 'F'; code: string }>()
const digits = (s: string) => s.replace(/\D/g, '')

export const tokenFor = (id: string) => `demo.${id}`

/** Authorization 헤더 → 로그인 사용자 */
export function requireUser(req: DemoRequest): DUser {
  const id = req.token?.startsWith('demo.') ? req.token.slice(5) : null
  const s = db()
  if (!id || s.me !== id) return fail(401, 'not_authenticated', '로그인이 필요해요.')
  const u = s.users.find((x) => x.id === id)
  if (!u) return fail(401, 'user_not_found', '다시 로그인해 주세요.')
  return u
}

/** 지금 문서 버전에 동의한 상태인지 — 기록이 없는 시드 회원은 모두 동의한 것으로 본다 (B6) */
export function hasConsent(u: DUser, kind: string): boolean {
  if (!u.consents) return true
  const c = u.consents[kind]
  return !!c && c.agreed && c.version === CONSENT_VERSIONS[kind]
}

export function setConsent(u: DUser, kind: string, agreed: boolean) {
  u.consents = { ...(u.consents ?? allAgreed()), [kind]: { version: CONSENT_VERSIONS[kind], agreed, at: new Date().toISOString() } }
}

function allAgreed(): NonNullable<DUser['consents']> {
  return Object.fromEntries(Object.keys(CONSENT_DOCS).map((k) => [k, { version: CONSENT_VERSIONS[k], agreed: true, at: '' }]))
}

type ConsentIn = Schema<'ConsentChoiceIn'>

/** 백엔드 AuthService._checked 와 같은 검사 — 모르는 종류·지난 버전은 받지 않는다 */
function checkConsents(items: ConsentIn[]) {
  const seen = new Set<string>()
  for (const c of items) {
    if (!(c.kind in CONSENT_DOCS) || seen.has(c.kind)) fail(422, 'consent_invalid', '동의 항목을 다시 확인해 주세요.')
    if (c.version !== CONSENT_VERSIONS[c.kind])
      fail(422, 'consent_outdated', '약관이 바뀌었어요. 화면을 새로 고친 뒤 다시 동의해 주세요.')
    seen.add(c.kind)
  }
  return items
}

/** 응답 모양은 백엔드 계약과 같아야 한다 — 어긋나면 타입 오류 (D3) */
export function userOut(u: DUser): Schema<'UserOut'> {
  return {
    id: u.id,
    name: u.name,
    birth_date: u.birth_date,
    age: ageOf(u.birth_date),
    gender: u.gender,
    region_code: u.region_code,
    region_name: regionLabel(u, REGIONS),
    interests: u.interests,
    intro: u.intro,
    has_location: u.geo !== null,
    consent_needed: Object.entries(CONSENT_DOCS).some(([k, required]) => required && !hasConsent(u, k)),
    health_consent: hasConsent(u, 'health'),
  }
}

function login(u: DUser): Schema<'LoggedInResult'> {
  const s = db()
  s.me = u.id
  u.last_login = Date.now()
  save()
  return { status: 'logged_in', access_token: tokenFor(u.id), user: userOut(u) }
}

function validateProfile(region?: string, interests?: string[]) {
  if (region !== undefined && !REGIONS[region]) fail(422, 'invalid_profile_input', '사는 곳을 다시 골라 주세요.')
  if (interests !== undefined) {
    if (interests.length === 0) fail(422, 'invalid_profile_input', '좋아하는 것을 하나 이상 골라 주세요.')
    if (interests.some((i) => !INTERESTS[i])) fail(422, 'invalid_profile_input', '고를 수 없는 것이 섞여 있어요. 다시 골라 주세요.')
    if (new Set(interests).size > MAX_INTERESTS)
      fail(422, 'invalid_profile_input', `좋아하는 것은 ${MAX_INTERESTS}개까지 고를 수 있어요.`)
  }
}

type Body = Record<string, unknown>

export const authRoutes: Route[] = [
  ['GET', '/auth/options', () =>
    json({
      regions: Object.entries(REGIONS).map(([code, label]) => ({ code, label })),
      interests: Object.entries(INTERESTS).map(([code, label]) => ({ code, label })),
      max_interests: MAX_INTERESTS,
      consents: Object.entries(CONSENT_DOCS).map(([kind, required]) => ({
        kind: kind as ConsentIn['kind'],
        version: CONSENT_VERSIONS[kind],
        required,
      })),
    } satisfies Schema<'SignupOptions'>)],

  ['POST', '/auth/pass/start', (req) => {
    const b = req.body as Body
    const phone = digits(String(b.phone ?? ''))
    if (!(phone.startsWith('01') && [10, 11].includes(phone.length)))
      fail(422, 'validation_error', '휴대폰 번호를 다시 확인해 주세요.')
    const id = newId()
    const code = String(Math.floor(Math.random() * 1_000_000)).padStart(6, '0')
    verifySessions.set(id, {
      name: String(b.name ?? '').trim(),
      birth_date: String(b.birth_date),
      phone,
      gender: b.gender === 'F' ? 'F' : 'M',
      code,
    })
    return json({ session_id: id, dev_code: code } satisfies Schema<'PassStartResponse'>)
  }],

  ['POST', '/auth/pass/verify', (req) => {
    const b = req.body as Body
    const v = verifySessions.get(String(b.session_id))
    if (!v) return fail(400, 'verification_failed', '인증 시간이 지났어요. 처음부터 다시 해 주세요.')
    if (v.code !== String(b.code)) return fail(400, 'verification_failed', '인증번호가 맞지 않아요. 다시 확인해 주세요.')
    verifySessions.delete(String(b.session_id))

    const s = db()
    const same = s.users.find((u) => u.name === v.name && u.birth_date === v.birth_date && u.phone === v.phone)
    if (same) return json(login(same))
    if (s.users.some((u) => u.phone === v.phone))
      return fail(409, 'phone_in_use', '이미 다른 분이 쓰고 있는 전화번호예요.')
    // 데모는 누구나 둘러볼 수 있게 나이 제한을 두지 않는다 (실서비스: 만 60세 이상)
    return json({
      status: 'signup_required',
      signup_token: btoa(encodeURIComponent(JSON.stringify(v))),
      name: v.name,
    } satisfies Schema<'SignupRequiredResult'>)
  }],

  ['POST', '/auth/signup', (req) => {
    const b = req.body as Body
    let ident: { name: string; birth_date: string; phone: string; gender: 'M' | 'F' }
    try {
      ident = JSON.parse(decodeURIComponent(atob(String(b.signup_token))))
    } catch {
      return fail(401, 'invalid_token', '인증 정보가 올바르지 않아요.')
    }
    const interests = (b.interests as string[]) ?? []
    validateProfile(String(b.region_code), interests)
    const given = new Map(checkConsents((b.consents as ConsentIn[]) ?? []).map((c) => [c.kind, c.agreed]))
    if (Object.entries(CONSENT_DOCS).some(([k, required]) => required && !given.get(k as ConsentIn['kind'])))
      fail(422, 'consent_required', '꼭 필요한 항목에 모두 동의해 주세요.')
    const at = new Date().toISOString()
    const u: DUser = {
      id: newId(), ...ident, region_code: String(b.region_code), interests: [...new Set(interests)],
      intro: '', geo: null, last_login: Date.now(),
      consents: Object.fromEntries(
        Object.keys(CONSENT_DOCS).map((k) => [k, { version: CONSENT_VERSIONS[k], agreed: !!given.get(k as ConsentIn['kind']), at }]),
      ),
    }
    db().users.push(u)
    return json(login(u), 201)
  }],

  ['POST', '/auth/refresh', () => {
    const me = db().me
    return me ? json({ access_token: tokenFor(me), token_type: 'bearer' } satisfies Schema<'TokenResponse'>) : fail(401, 'not_authenticated', '로그인이 필요해요.')
  }],

  ['POST', '/auth/logout', () => {
    db().me = null
    save()
    return noContent()
  }],

  ['GET', '/me', (req) => json(userOut(requireUser(req)))],

  ['GET', '/me/consents', (req) => {
    const u = requireUser(req)
    return json(
      Object.entries(CONSENT_DOCS).map(([kind, required]) => ({
        kind: kind as ConsentIn['kind'],
        version: CONSENT_VERSIONS[kind],
        required,
        agreed: hasConsent(u, kind),
        decided_at: u.consents?.[kind]?.at || null,
      })) satisfies Schema<'ConsentStatusOut'>[],
    )
  }],

  ['POST', '/me/consents', (req) => {
    const u = requireUser(req)
    const items = checkConsents(((req.body as Body).items as ConsentIn[]) ?? [])
    if (items.some((c) => !c.agreed)) fail(422, 'consent_invalid', '동의 철회는 해당 화면에서 해 주세요.')
    for (const c of items) setConsent(u, c.kind, true)
    save()
    return json(userOut(u))
  }],

  ['PATCH', '/me', (req) => {
    const u = requireUser(req)
    const b = req.body as { intro?: string; region_code?: string; interests?: string[] }
    validateProfile(b.region_code, b.interests)
    if (b.intro !== undefined) {
      if (b.intro.length > INTRO_MAX_LEN) fail(422, 'validation_error', `소개는 ${INTRO_MAX_LEN}자까지 쓸 수 있어요.`)
      u.intro = b.intro.split(/\s+/).filter(Boolean).join(' ')
    }
    if (b.region_code !== undefined && b.region_code !== u.region_code) {
      u.region_code = b.region_code
      u.area = undefined // 이사 — 예전 동네 이름은 지운다
    }
    if (b.interests !== undefined) u.interests = [...new Set(b.interests)]
    save()
    return json(userOut(u))
  }],

  ['PUT', '/me/location', (req) => {
    const u = requireUser(req)
    // 데모: 실제 GPS 대신 시연 동네 한가운데로 둔다 — 보는 사람이 어디 있든 '같은 동네' 이웃이 보이게.
    // (실서버는 받은 좌표를 소수점 2자리로 뭉개 저장 — backend auth.service)
    u.geo = DEMO_HOME
    save()
    return json(userOut(u))
  }],

  // ---- 데모 전용 ----
  ['POST', '/demo/login', () => json(login(db().users.find((u) => u.id === DEMO_ME_ID)!))],
]
