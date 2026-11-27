/**
 * 휴대폰 알림(Web Push) — 이 기기(브라우저)의 구독 다루기 (C4).
 * 화면(설정 → 휴대폰 알림)은 features/notification, 알림 표시·누르기는 public/sw.js.
 * 로그아웃할 때도 이 기기 구독을 지워야 해서(auth) shared 에 둔다.
 */
import { api } from '@/shared/api/client'

export type PushSupport = 'ok' | 'unsupported' | 'ios-install'

const BASE = import.meta.env.BASE_URL

function isIos(): boolean {
  const ua = navigator.userAgent
  // 아이패드 사파리는 맥으로 보인다 — 터치가 되면 아이패드
  return /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)
}

function isStandalone(): boolean {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

/** 이 브라우저가 휴대폰 알림을 받을 수 있는지. 아이폰은 '홈 화면에 추가'한 앱에서만 된다(iOS 16.4+) */
export function pushSupport(): PushSupport {
  const ok = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
  if (ok) return 'ok'
  return isIos() && !isStandalone() ? 'ios-install' : 'unsupported'
}

async function registration(): Promise<ServiceWorkerRegistration | undefined> {
  if (!('serviceWorker' in navigator)) return undefined
  // 운영 빌드에서만 서비스 워커를 등록한다(shared/lib/pwa) — 개발 서버에서는 없음
  return navigator.serviceWorker.getRegistration(BASE)
}

/** base64url(VAPID 공개 키) → 바이트 */
function keyBytes(base64url: string): Uint8Array<ArrayBuffer> {
  const pad = '='.repeat((4 - (base64url.length % 4)) % 4)
  const raw = atob((base64url + pad).replace(/-/g, '+').replace(/_/g, '/'))
  const out = new Uint8Array(new ArrayBuffer(raw.length))
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

function sameKey(sub: PushSubscription, publicKey: string): boolean {
  const current = sub.options.applicationServerKey
  if (!current) return false
  const a = new Uint8Array(current)
  const b = keyBytes(publicKey)
  return a.length === b.length && a.every((v, i) => v === b[i])
}

/** 이 기기의 지금 구독 (없으면 null) */
export async function currentSubscription(): Promise<PushSubscription | null> {
  const reg = await registration()
  return (await reg?.pushManager.getSubscription()) ?? null
}

/** 이 기기에서 지금 알림이 켜져 있는지 — 브라우저 허용 + 이 서버 키로 구독 */
export async function isSubscribed(publicKey: string): Promise<boolean> {
  if (pushSupport() !== 'ok' || Notification.permission !== 'granted') return false
  const sub = await currentSubscription()
  return sub !== null && sameKey(sub, publicKey)
}

export type SubscribeResult = { ok: true; subscription: PushSubscriptionJSON } | { ok: false; reason: 'denied' | 'no-worker' }

/**
 * 허용을 묻고 구독한다. 서버 키가 바뀌었으면(옛 구독) 지우고 새로.
 * 서버에 알리는 일(PUT)은 부른 쪽 — 이 파일은 브라우저 쪽만.
 */
export async function subscribeDevice(publicKey: string): Promise<SubscribeResult> {
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return { ok: false, reason: 'denied' }
  const reg = await registration()
  if (!reg) return { ok: false, reason: 'no-worker' }
  const old = await reg.pushManager.getSubscription()
  if (old && !sameKey(old, publicKey)) await old.unsubscribe()
  const sub =
    old && sameKey(old, publicKey)
      ? old
      : await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(publicKey) })
  return { ok: true, subscription: sub.toJSON() }
}

/**
 * 이 기기에서 알림 끄기 — 서버 구독을 지우고 브라우저 구독도 해제.
 * 로그아웃 전에도 부른다: 같은 기기를 다음 사람이 쓸 때 앞 사람 알림이 오지 않게.
 * 실패해도 멈추지 않는다 (서버 쪽은 다음 발송 때 '구독 끝남'으로 정리된다).
 */
export async function unsubscribeDevice(): Promise<void> {
  const sub = await currentSubscription().catch(() => null)
  if (!sub) return
  await api.post<void>('/notifications/push/unsubscribe', { endpoint: sub.endpoint }).catch(() => undefined)
  await sub.unsubscribe().catch(() => undefined)
}
