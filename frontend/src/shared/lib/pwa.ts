/**
 * 홈 화면에 추가(PWA) — 서비스 워커 등록과 '설치' 제안 보관.
 * 서비스 워커 본체는 public/sw.js, 앱 정보는 public/manifest.webmanifest.
 */
import { useSyncExternalStore } from 'react'

/** 운영 빌드에서만 등록 (개발 서버에서는 저장본이 수정 사항을 가려 혼란스럽다) */
export function registerServiceWorker() {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return
  const base = import.meta.env.BASE_URL
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${base}sw.js`, { scope: base }).catch(() => {
      // 등록 실패해도 앱은 그대로 쓸 수 있다 — 오프라인 첫 화면만 안 될 뿐
    })
  })
}

/** Chrome·삼성 인터넷이 주는 '설치' 제안 (표준 타입에 없어 직접 선언) */
interface InstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let deferred: InstallPromptEvent | null = null
let installed = false
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault() // 브라우저가 멋대로 띄우지 않게 — 우리 안내 화면의 버튼으로만
    deferred = e as InstallPromptEvent
    emit()
  })
  window.addEventListener('appinstalled', () => {
    deferred = null
    installed = true
    emit()
  })
}

/** 홈 화면 아이콘으로 열렸는가 */
export function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

export type Platform = 'ios' | 'android' | 'other'
export function detectPlatform(ua = navigator.userAgent): Platform {
  if (/iPhone|iPad|iPod/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return 'ios'
  if (/Android/i.test(ua)) return 'android'
  return 'other'
}

export interface InstallState {
  /** 버튼 한 번으로 설치 가능 (브라우저가 제안을 줌) */
  canPrompt: boolean
  /** 이미 설치됨/아이콘으로 열림 */
  installed: boolean
}

let snapshot: InstallState = { canPrompt: false, installed: false }
function getSnapshot(): InstallState {
  const next = { canPrompt: deferred !== null, installed: installed || isStandalone() }
  if (next.canPrompt !== snapshot.canPrompt || next.installed !== snapshot.installed) snapshot = next
  return snapshot
}
function subscribe(l: () => void) {
  listeners.add(l)
  return () => listeners.delete(l)
}

export function useInstallState(): InstallState {
  return useSyncExternalStore(subscribe, getSnapshot)
}

/** 브라우저의 설치 창을 띄운다. 설치했으면 true */
export async function promptInstall(): Promise<boolean> {
  if (!deferred) return false
  const e = deferred
  deferred = null
  emit()
  await e.prompt()
  const { outcome } = await e.userChoice
  return outcome === 'accepted'
}
