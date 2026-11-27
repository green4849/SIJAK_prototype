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

  test('H34: 서비스 워커에 빌드 버전과 미리 저장할 파일이 들어 있고, 그 파일이 실제로 저장된다', async ({ page, request }) => {
    const sw = await (await request.get('/sw.js')).text()
    expect(sw).not.toContain('__SW_')
    const version = sw.match(/const VERSION = "([0-9a-f]{12})"/)?.[1]
    expect(version).toBeTruthy()
    const files: string[] = JSON.parse(sw.match(/const PRECACHE = (\[.*\])/)![1])
    expect(files.some((f) => /^assets\/index-.*\.js$/.test(f))).toBe(true)
    expect(files.some((f) => /sijagi3d|\.glb$/.test(f))).toBe(false) // 3D는 쓸 때 받는다

    await page.goto('/')
    await page.waitForFunction(() => navigator.serviceWorker.ready.then(() => true))
    const cached = await page.evaluate(async (v) => {
      const c = await caches.open(`sijak-${v}`)
      return (await c.keys()).map((r) => new URL(r.url).pathname.replace(/^\//, ''))
    }, version)
    expect(cached).toEqual(expect.arrayContaining(files))
  })

  test('H34: 새 배포가 받아지면 "새 버전이 있어요" → 새로 고침하면 새 워커로 바뀐다', async ({ page }) => {
    await startTour(page)
    await page.waitForFunction(() => navigator.serviceWorker.ready.then(() => true))
    await page.reload()
    await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true)

    // 새 배포 흉내 — 같은 범위에 다른 주소의 워커를 받게 한다 (실제 배포는 sw.js 내용이 바뀌어 같은 일이 일어남)
    await page.evaluate(() => navigator.serviceWorker.register('/sw.js?next', { scope: '/' }))

    const banner = page.getByRole('status').filter({ hasText: '새 버전이 있어요' })
    await expect(banner).toBeVisible()
    const waitingBefore = await page.evaluate(() => navigator.serviceWorker.getRegistration().then((r) => !!r?.waiting))
    expect(waitingBefore).toBe(true)

    // 누르면 새 워커로 바뀌고 화면을 다시 읽는다 (다시 읽기 전 표시가 사라짐)
    await page.evaluate(() => ((window as Window & { __beforeUpdate?: boolean }).__beforeUpdate = true))
    await Promise.all([page.waitForEvent('load'), banner.getByRole('button', { name: '새로 고침' }).click()])
    await expect(page.getByRole('heading', { name: '김시작님' })).toBeVisible()
    expect(await page.evaluate(() => (window as Window & { __beforeUpdate?: boolean }).__beforeUpdate ?? false)).toBe(false)
    const active = await page.evaluate(() => navigator.serviceWorker.getRegistration().then((r) => r?.active?.scriptURL))
    expect(active).toMatch(/sw\.js\?next$/)
    // (다시 읽힌 앱은 원래 주소 sw.js 를 등록하므로 여기서는 또 '새 버전'으로 보인다 — 흉내의 부작용이라 더 보지 않는다)
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
  await page.getByRole('navigation', { name: '더 보기' }).getByRole('link', { name: '홈 화면에 아이콘 놓기' }).click()
  await expect(page.getByRole('list', { name: '아이폰에서 놓는 방법' })).toContainText('홈 화면에 추가')
  await ctx.close()
})
