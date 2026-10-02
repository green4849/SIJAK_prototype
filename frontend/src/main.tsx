import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from '@/app/App'
// 폰트는 번들에 포함 (외부 CDN 없음 — 오프라인·개인정보 측면)
import '@fontsource/jua/400.css'
import '@fontsource/noto-sans-kr/400.css'
import '@fontsource/noto-sans-kr/500.css'
import '@fontsource/noto-sans-kr/700.css'
import '@fontsource/noto-sans-kr/800.css'
import '@/shared/styles/base.css'
import { applyPrefs, loadPrefs } from '@/shared/a11y/preferences'

// 첫 화면부터 글자 크기·대비 적용 (깜빡임 방지)
applyPrefs(loadPrefs())

async function start() {
  // 데모 빌드(서버 없음)에서만 가짜 서버를 끼운다 — 일반 빌드에서는 이 코드가 통째로 빠진다
  let banner = null
  if (import.meta.env.VITE_DEMO === '1') {
    const demo = await import('@/demo')
    demo.installDemo()
    banner = <demo.DemoBanner />
  }

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      {banner}
      <App />
    </StrictMode>,
  )
}

void start()
