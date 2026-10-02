/**
 * 접근성 스윕 — 모든 화면 × (기본 / 아주 큰 글씨 + 선명한 화면)
 *  - 가로 넘침 없음 (큰 글씨에서 잘리지 않음)
 *  - 터치 영역 높이 44px 이상 (WCAG 2.5.5)
 *  - 콘솔 오류 없음
 * 폴리싱 중 레이아웃이 깨지면 여기서 먼저 잡힌다.
 */
import { expect, test, type Page } from '@playwright/test'
import { startTour } from './helpers'

const STATIC_ROUTES = [
  '/', '/friends', '/activities', '/chats', '/me', '/me/profile', '/me/settings', '/me/help', '/me/install',
  '/me/friends', '/me/blocks', '/me/activities/applied', '/me/activities/liked', '/safety',
]

async function dynamicRoutes(page: Page) {
  await page.goto('/chats')
  const room = await page.getByRole('link', { name: /이순자님/ }).getAttribute('href')
  await page.goto('/activities')
  const act = await page.getByRole('link', { name: /건강 걷기 모임/ }).getAttribute('href')
  // basename(/저장소명/)이 붙은 href라도 앱 기준 경로로
  return [room!, act!].map((h) => h.replace(/^.*?(\/(chats|activities)\/)/, '$1'))
}

for (const mode of ['기본', '아주 크게 + 선명한 화면'] as const) {
  test(`모든 화면 점검 — ${mode}`, async ({ page }) => {
    test.setTimeout(120_000)
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(String(e)))
    page.on('console', (m) => m.type() === 'error' && !/status of 40[134]/.test(m.text()) && errors.push(m.text()))

    await startTour(page)
    if (mode !== '기본') {
      await page.goto('/me/settings')
      await page.getByRole('radio', { name: '아주 크게' }).click()
      await page.getByRole('radio', { name: '선명한 화면' }).click()
    }

    const problems: string[] = []
    for (const path of [...STATIC_ROUTES, ...(await dynamicRoutes(page))]) {
      await page.goto(path)
      await page.waitForLoadState('networkidle')
      const r = await page.evaluate(() => ({
        overflow: document.documentElement.scrollWidth > innerWidth,
        small: [...document.querySelectorAll<HTMLElement>('button, a, input, [role=tab]')]
          .filter((el) => el.offsetParent !== null)
          .map((el) => ({ el, h: el.getBoundingClientRect().height }))
          .filter(({ h }) => h > 0 && h < 44)
          .map(({ el, h }) => `${el.tagName.toLowerCase()}「${(el.innerText || el.getAttribute('aria-label') || '').trim().slice(0, 12)}」${Math.round(h)}px`),
      }))
      if (r.overflow) problems.push(`${path}: 가로 넘침`)
      if (r.small.length) problems.push(`${path}: 작은 터치 영역 ${r.small.join(', ')}`)
    }

    expect(problems, problems.join('\n')).toEqual([])
    expect(errors).toEqual([])
  })
}
