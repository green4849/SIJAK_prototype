/**
 * 화면 캡처 — 디자인 점검용 (기본 실행에서는 건너뜀).
 *   SCREENS=1 SCREENS_DIR=out npx playwright test e2e/screens.spec.ts
 * 390px 폭(디자인 프레임 기준) · 글자 크기 1단계 / 4단계, 태블릿 820px(1단계) 세 벌.
 * 파일 이름 앞: 1-/4- (휴대폰 글자 단계), t- (태블릿)
 */
import { expect, test, type Page } from '@playwright/test'
import { startTour } from './helpers'

test.skip(!process.env.SCREENS, 'SCREENS=1 일 때만')
test.use({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })

const dir = process.env.SCREENS_DIR ?? 'test-results/screens'

async function shot(page: Page, name: string) {
  await page.waitForLoadState('networkidle')
  await page.evaluate(() => document.fonts.ready)
  await page.screenshot({ path: `${dir}/${name}.png`, fullPage: true })
}

const RUNS = [
  { prefix: '1', scale: '1', width: 390 },
  { prefix: '4', scale: '4', width: 390 },
  { prefix: 't', scale: '1', width: 820 },
]

for (const { prefix, scale, width } of RUNS) {
  test(`화면 캡처 (${prefix})`, async ({ page }) => {
    test.setTimeout(90_000)
    await page.setViewportSize({ width, height: width > 600 ? 1180 : 844 })
    await page.addInitScript((s) => {
      const k = 'wipi.a11y'
      const cur = JSON.parse(localStorage.getItem(k) ?? '{}')
      localStorage.setItem(k, JSON.stringify({ ...cur, fontScale: Number(s) }))
    }, scale)
    const p = (n: string) => `${prefix}-${n}`

    await page.goto('/welcome')
    await shot(page, p('01-welcome'))
    await page.goto('/login')
    await shot(page, p('02-login'))

    await startTour(page)
    await shot(page, p('03-home'))
    await page.goto('/friends')
    await expect(page.getByRole('article').first()).toBeVisible()
    await shot(page, p('04-friends'))
    await page.goto('/chats')
    await page.getByRole('link').filter({ hasText: '님' }).first().click()
    await expect(page.getByRole('textbox')).toBeVisible()
    await shot(page, p('05-chat'))
    await page.goto('/activities')
    await shot(page, p('06-activities'))
    await page.getByRole('link', { name: /의자 요가/ }).click()
    await expect(page.getByRole('heading', { name: '의자 요가' })).toBeVisible()
    await shot(page, p('07-activity'))
    await page.goto('/safety')
    await shot(page, p('08-safety'))
    await page.goto('/me')
    await expect(page.getByRole('heading', { name: '마이페이지' })).toBeVisible()
    await shot(page, p('09-me'))
  })
}
