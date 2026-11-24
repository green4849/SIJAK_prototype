/** H33 — 화면별로 나눠 받기: 첫 화면 밖의 화면은 들어갈 때 받고, 못 받으면 흰 화면 대신 안내 */
import { expect, test } from '@playwright/test'
import { mainNav, startTour } from './helpers'

test('H33: 마이페이지 조각은 홈에서 받지 않고, 들어갈 때 받는다', async ({ page }) => {
  const asked: string[] = []
  page.on('request', (r) => asked.push(new URL(r.url()).pathname))
  await startTour(page)
  expect(asked.some((p) => /\/assets\/MyPage-.*\.js$/.test(p))).toBe(false)

  await mainNav(page).getByRole('link', { name: '마이페이지' }).click()
  await expect(page.getByRole('heading', { name: '마이페이지' })).toBeVisible()
  expect(asked.some((p) => /\/assets\/MyPage-.*\.js$/.test(p))).toBe(true)
})

test('H33: 화면 조각을 못 받으면 안내와 다시 시도 → 연결되면 열린다', async ({ page }) => {
  await startTour(page)
  await page.route(/\/assets\/MyPage-.*\.js$/, (r) => r.abort('internetdisconnected'))
  await mainNav(page).getByRole('link', { name: '마이페이지' }).click()
  await expect(page.getByRole('heading', { name: '화면을 불러오지 못했어요' })).toBeVisible()
  // 하단 메뉴는 그대로 — 다른 화면으로 갈 수 있다
  await expect(mainNav(page)).toBeVisible()

  await page.unroute(/\/assets\/MyPage-.*\.js$/)
  await page.getByRole('button', { name: '다시 시도' }).click()
  await expect(page.getByRole('heading', { name: '마이페이지' })).toBeVisible()
})
