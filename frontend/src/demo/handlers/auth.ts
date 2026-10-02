/** backend/app/domains/auth 와 같은 계약 */
import { INTERESTS, INTRO_MAX_LEN, MAX_INTERESTS, REGIONS } from '../constants'
import { fail, json, noContent, type DemoRequest, type Route } from '../http'
import { ageOf, db, DEMO_ME_ID, newId, save, type DUser } from '../store'

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

export function userOut(u: DUser) {
  return {
    id: u.id,
    name: u.name,
    birth_date: u.birth_date,
    age: ageOf(u.birth_date),
    gender: u.gender,
    region_code: u.region_code,
    region_name: REGIONS[u.region_code] ?? u.region_code,
    interests: u.interests,
    intro: u.intro,
    has_location: u.has_location,
  }
}

function login(u: DUser) {
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
    if (interests.some((i) => !INTERESTS[i])) fail(422, 'invalid_profile_input', '고를 수 없는 관심사가 있어요.')
    if (new Set(interests).size > MAX_INTERESTS)
      fail(422, 'invalid_profile_input', `관심사는 ${MAX_INTERESTS}개까지 고를 수 있어요.`)
  }
}

type Body = Record<string, unknown>

export const authRoutes: Route[] = [
  ['GET', '/auth/options', () =>
    json({
      regions: Object.entries(REGIONS).map(([code, label]) => ({ code, label })),
      interests: Object.entries(INTERESTS).map(([code, label]) => ({ code, label })),
      max_interests: MAX_INTERESTS,
    })],

  ['POST', '/auth/pass/start', (req) => {
    const b = req.body as Body
    const phone = digits(String(b.phone ?? ''))
    if (!(phone.startsWith('01') && [10, 11].includes(phone.length)))
      fail(422, 'validation_error', '휴대전화 번호를 다시 확인해 주세요.')
    const id = newId()
    const code = String(Math.floor(Math.random() * 1_000_000)).padStart(6, '0')
    verifySessions.set(id, {
      name: String(b.name ?? '').trim(),
      birth_date: String(b.birth_date),
      phone,
      gender: b.gender === 'F' ? 'F' : 'M',
      code,
    })
    return json({ session_id: id, dev_code: code })
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
    return json({ status: 'signup_required', signup_token: btoa(encodeURIComponent(JSON.stringify(v))), name: v.name })
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
    const u: DUser = {
      id: newId(), ...ident, region_code: String(b.region_code), interests: [...new Set(interests)],
      intro: '', has_location: false, last_login: Date.now(),
    }
    db().users.push(u)
    return json(login(u), 201)
  }],

  ['POST', '/auth/refresh', () => {
    const me = db().me
    return me ? json({ access_token: tokenFor(me), token_type: 'bearer' }) : fail(401, 'not_authenticated', '로그인이 필요해요.')
  }],

  ['POST', '/auth/logout', () => {
    db().me = null
    save()
    return noContent()
  }],

  ['GET', '/me', (req) => json(userOut(requireUser(req)))],

  ['PATCH', '/me', (req) => {
    const u = requireUser(req)
    const b = req.body as { intro?: string; region_code?: string; interests?: string[] }
    validateProfile(b.region_code, b.interests)
    if (b.intro !== undefined) {
      if (b.intro.length > INTRO_MAX_LEN) fail(422, 'validation_error', `소개는 ${INTRO_MAX_LEN}자까지 쓸 수 있어요.`)
      u.intro = b.intro.split(/\s+/).filter(Boolean).join(' ')
    }
    if (b.region_code !== undefined) u.region_code = b.region_code
    if (b.interests !== undefined) u.interests = [...new Set(b.interests)]
    save()
    return json(userOut(u))
  }],

  ['PUT', '/me/location', (req) => {
    const u = requireUser(req)
    u.has_location = true // 데모는 좌표를 저장하지 않는다
    save()
    return json(userOut(u))
  }],

  // ---- 데모 전용 ----
  ['POST', '/demo/login', () => json(login(db().users.find((u) => u.id === DEMO_ME_ID)!))],
]
