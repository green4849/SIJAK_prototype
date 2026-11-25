/**
 * H42 — 운영 서버(infra/Caddyfile)의 Content-Security-Policy 가 앱을 막지 않는지.
 * 시연 빌드의 문서 응답에 같은 정책을 붙여 여러 화면을 돌고, 브라우저가 알린 위반이 0건이어야 한다.
 */
import { readFileSync } from 'node:fs'
import { expect, test, type Page } from '@playwright/test'
import { mainNav, startTour } from './helpers'

const caddy = readFileSync(new URL('../../infra/Caddyfile', import.meta.url), 'utf8')
const CSP = caddy.match(/Content-Security-Policy "([^"]+)"/)![1]

async function withCsp(page: Page) {
  const violations: string[] = []
  await page.exposeFunction('__cspViolation', (v: string) => violations.push(v))
  await page.addInitScript(() => {
    document.addEventListener('securitypolicyviolation', (e) =>
      (window as unknown as { __cspViolation: (v: string) => void }).__cspViolation(
        `${e.effectiveDirective} ← ${e.blockedURI}`,
      ),
    )
  })
  await page.route('**/*', async (route) => {
    if (route.request().resourceType() !== 'document') return route.continue()
    const res = await route.fetch()
    await route.fulfill({ response: res, headers: { ...res.headers(), 'content-security-policy': CSP } })
  })
  return violations
}

test('H42: 정책에서 지도·사진·오류 수집 도메인만 허용하고, 다른 사이트에 넣지 못하게(frame-ancestors) 한다', () => {
  expect(CSP).toContain("frame-ancestors 'none'")
  expect(CSP).toContain("script-src 'self';")
  expect(CSP).not.toContain('unsafe-inline')
  expect(CSP.match(/https:\/\/[^\s;]+/g)).toEqual(['https://images.unsplash.com', 'https://nominatim.openstreetmap.org', 'https://*.ingest.sentry.io', 'https://*.ingest.us.sentry.io', 'https://*.ingest.de.sentry.io'])
})

test('3D 시작이: three.js 가 모델 안의 그림을 blob: 주소로 fetch 하므로 connect-src 에 blob: 이 있다', () => {
  // CI 러너는 그래픽 칩이 없어 3D 를 건너뛰므로(SijagiActor 의 SOFTWARE_GL) 아래 화면 순회로는 잡히지 않는다
  expect(CSP).toMatch(/connect-src [^;]*\bblob:/)
})

test('Render 배포(render.yaml)의 CSP 가 Caddyfile 과 같다', () => {
  const render = readFileSync(new URL('../../render.yaml', import.meta.url), 'utf8')
  expect(render.match(/name: Content-Security-Policy\s+value: "([^"]+)"/)![1]).toBe(CSP)
})

test('H42: 운영 CSP 아래에서 시작·홈·친구·지역생활·대화·마이페이지가 막히지 않는다', async ({ page }) => {
  const violations = await withCsp(page)
  await page.goto('/welcome')
  await expect(page.getByRole('button', { name: '시작하기' }).or(page.getByRole('link', { name: '시작하기' }))).toBeVisible()
  await startTour(page)
  await mainNav(page).getByRole('link', { name: /친구/ }).click()
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await mainNav(page).getByRole('link', { name: /지역생활/ }).click()
  await expect(page.locator('img').first()).toBeVisible()
  await page.goto('/chats')
  await page.getByRole('link', { name: /정덕수님/ }).click()
  await expect(page.getByRole('textbox')).toBeVisible()
  await page.goto('/me')
  await expect(page.getByRole('heading', { name: '마이페이지' })).toBeVisible()
  // 시작이 안내(말풍선·움직이는 그림)를 열어 본다 — 스타일을 가장 많이 바꾸는 곳
  await page.getByRole('button', { name: '시작이에게 앱 사용법 물어보기' }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  expect(violations).toEqual([])
})
