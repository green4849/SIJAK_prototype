import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from '@/app/App'
// 폰트는 번들에 포함 (외부 CDN 없음 — 오프라인·개인정보 측면). Jua는 로고 전용, 굵기는 tokens.css --weight-*
// 본문은 가변 글꼴 하나(굵기 400~700을 파일 하나로) — 굵기별 4벌이면 글꼴 규칙만 수백 개라 첫 화면 CSS가 무거웠다 (H33)
import '@/shared/styles/brand-font.css'
import '@fontsource-variable/noto-sans-kr/wght.css'
import '@/shared/styles/base.css'
import { applyPrefs, loadPrefs } from '@/shared/a11y/preferences'
import { registerServiceWorker } from '@/shared/lib/pwa'

// 첫 화면부터 글자 크기·대비 적용 (깜빡임 방지)
applyPrefs(loadPrefs())

async function start() {
  if (import.meta.env.VITE_SENTRY_DSN) {
    const { initMonitoring } = await import('@/shared/lib/monitoring')
    await initMonitoring().catch(() => undefined)
  }
  // 데모 빌드(서버 없음)에서만 가짜 서버를 끼운다 — 일반 빌드에서는 이 코드가 통째로 빠진다
  if (import.meta.env.VITE_DEMO === '1') {
    const demo = await import('@/demo')
    await demo.installDemo()
  }

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

void start()
// 홈 화면 아이콘·오프라인 첫 화면 (운영·데모 빌드에서만)
registerServiceWorker()
