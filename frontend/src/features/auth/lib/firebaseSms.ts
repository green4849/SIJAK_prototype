/**
 * Firebase 전화 인증 문자 (B4) — 서버가 /auth/pass/start 응답에 sms 를 주면 쓴다.
 *
 *   sendSms(challenge) → Firebase 가 그 번호로 6자리 문자를 보낸다 (reCAPTCHA 는 보이지 않게)
 *   confirm(code)      → 맞으면 Firebase ID 토큰 → 서버 /auth/pass/verify 의 id_token
 *
 * firebase 패키지는 이 파일을 처음 쓸 때만 불러온다 (첫 화면 묶음에 넣지 않음).
 */
import type { Schema } from '@/shared/api/types'

export type SmsChallenge = Schema<'SmsChallenge'>

/** 문자 확인 — 받은 6자리를 넣으면 서버에 보낼 ID 토큰을 준다 */
export interface SentSms {
  confirm: (code: string) => Promise<string>
}

const CONTAINER_ID = 'firebase-recaptcha'

type AuthModule = typeof import('firebase/auth')
let loaded: Promise<{ authMod: AuthModule; auth: import('firebase/auth').Auth }> | null = null
let verifier: import('firebase/auth').RecaptchaVerifier | null = null

function load(cfg: SmsChallenge['firebase']) {
  loaded ??= (async () => {
    const [{ initializeApp, getApps }, authMod] = await Promise.all([
      import('firebase/app'),
      import('firebase/auth'),
    ])
    const app =
      getApps()[0] ??
      initializeApp({
        apiKey: cfg.api_key,
        authDomain: cfg.auth_domain,
        projectId: cfg.project_id,
        appId: cfg.app_id,
      })
    const auth = authMod.getAuth(app)
    auth.languageCode = 'ko' // 문자 문구를 한국어로
    return { authMod, auth }
  })()
  return loaded
}

/** reCAPTCHA 는 화면에 보이지 않는 자리 하나에 붙인다 (다시 받기마다 새로) */
function container(): HTMLElement {
  let el = document.getElementById(CONTAINER_ID)
  if (!el) {
    el = document.createElement('div')
    el.id = CONTAINER_ID
    document.body.appendChild(el)
  }
  return el
}

export async function sendSms(challenge: SmsChallenge): Promise<SentSms> {
  const { authMod, auth } = await load(challenge.firebase)
  try {
    verifier?.clear()
    verifier = new authMod.RecaptchaVerifier(auth, container(), { size: 'invisible' })
    const result = await authMod.signInWithPhoneNumber(auth, challenge.phone_e164, verifier)
    return {
      confirm: async (code) => {
        try {
          const cred = await result.confirm(code)
          return await cred.user.getIdToken()
        } catch (e) {
          throw new Error(smsErrorMessage(e))
        }
      },
    }
  } catch (e) {
    throw new Error(smsErrorMessage(e))
  }
}

/** Firebase 오류 → 어르신이 읽을 말 */
export function smsErrorMessage(e: unknown): string {
  const code = typeof e === 'object' && e && 'code' in e ? String((e as { code: unknown }).code) : ''
  switch (code) {
    case 'auth/invalid-verification-code':
      return '인증번호가 맞지 않아요. 다시 확인해 주세요.'
    case 'auth/code-expired':
    case 'auth/session-expired':
      return '인증번호 시간이 지났어요. 다시 받아 주세요.'
    case 'auth/too-many-requests':
      return '요청이 너무 많아요. 잠시 뒤 다시 해 주세요.'
    case 'auth/quota-exceeded':
      return '오늘은 문자를 더 보낼 수 없어요. 내일 다시 해 주세요.'
    case 'auth/invalid-phone-number':
    case 'auth/missing-phone-number':
      return '휴대폰 번호를 다시 확인해 주세요.'
    case 'auth/network-request-failed':
      return '연결이 원활하지 않아요. 잠시 후 다시 시도해 주세요.'
    default:
      return '인증 문자를 보내지 못했어요. 잠시 후 다시 해 주세요.'
  }
}
