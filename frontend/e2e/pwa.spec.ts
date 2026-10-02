/** C5 — 홈 화면에 추가(PWA): 설치 조건, 오프라인 첫 화면, 안내 화면 */
import { expect, test } from '@playwright/test'
import { startTour } from './helpers'

test.describe('서비스 워커 사용', () => {
  test.use({ serviceWorkers: 'allow' })

  test('C5: 설치 조건 충족 (manifest·아이콘·서비스 워커)', async ({ page, request }) => {
    const res = await request.get('/manifest.webmanifest')
    expect(res.ok()).toBe(true)
    const m = await res.json()
    expect(m.short_name).toBe('시작')
    expect(m.display).toBe('standalone')
    const sizes = m.icons.map((i: { sizes: string; purpose: string }) => `${i.sizes}/${i.purpose}`)
    expect(sizes).toEqual(expect.arrayContaining(['192x192/any', '512x512/any', '512x512/maskable']))
    for (const i of m.icons) expect((await request.get(`/${i.src}`)).ok()).toBe(true)

    await page.goto('/')
    await page.waitForFunction(() => navigator.serviceWorker.ready.then(() => true))
    // Chrome이 판단하는 '설치 가능' 조건 — 오류 목록이 비어야 한다
    // (Playwright 창은 항상 시크릿 모드라 'in-incognito' 하나는 환경 탓이므로 뺀다)
    const cdp = await page.context().newCDPSession(page)
    const { installabilityErrors } = await cdp.send('Page.getInstallabilityErrors')
    expect(installabilityErrors.filter((e) => e.errorId !== 'in-incognito')).toEqual([])
  })

  test('C5: 인터넷이 끊겨도 첫 화면이 뜨고, 끊김 안내가 나온다', async ({ page, context }) => {
    await startTour(page)
    // 서비스 워커가 화면을 맡을 때까지 (첫 방문은 워커 설치 전에 그려짐)
    await page.waitForFunction(() => navigator.serviceWorker.ready.then(() => true))
    await page.reload()
    await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true)

    await context.setOffline(true)
    await page.goto('/me')
    await expect(page.getByRole('heading', { name: '마이페이지' })).toBeVisible()
    await expect(page.getByRole('status').filter({ hasText: '인터넷이 끊겼어요' })).toBeVisible()

    await context.setOffline(false)
    await expect(page.getByText('인터넷이 끊겼어요')).toHaveCount(0)
  })
})

test('C5: 마이페이지 → 홈 화면에 아이콘 놓기 안내 (아이폰은 공유 버튼 순서)', async ({ browser }) => {
  const ctx = await browser.newContext({
    baseURL: 'http://localhost:4173',
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  })
  const page = await ctx.newPage()
  await startTour(page)
  await page.goto('/me')
  await page.getByRole('link', { name: '홈 화면에 아이콘 놓기' }).click()
  await expect(page.getByRole('list', { name: '아이폰에서 놓는 방법' })).toContainText('홈 화면에 추가')
  await ctx.close()
})
