import { defineConfig, devices } from '@playwright/test'

/**
 * E2E — 데모 빌드(브라우저 안 가짜 서버)를 대상으로 돈다 → 백엔드 없이 CI에서 실행 가능.
 * 테스트마다 새 브라우저 컨텍스트 = 새 sessionStorage = 시드 상태에서 시작.
 *
 *   npm run e2e           # 빌드 + 실행
 *   npm run e2e -- --ui   # 화면 보며 디버깅
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://localhost:4173',
    // 어르신이 주로 쓰는 휴대폰 크기
    ...devices['Pixel 7'],
    launchOptions: process.env.PW_CHROMIUM_PATH
      ? { executablePath: process.env.PW_CHROMIUM_PATH }
      : undefined,
    // 서비스 워커의 저장본이 테스트끼리 섞이지 않게 — PWA 테스트(e2e/pwa.spec.ts)만 켠다
    serviceWorkers: 'block',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'npm run build:demo && npx vite preview --mode demo --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
})
