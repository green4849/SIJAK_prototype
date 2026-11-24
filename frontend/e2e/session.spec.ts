/** H31 — 잠깐 끊겼다고 로그아웃되지 않는다 (지하·엘리베이터) */
import { expect, test } from '@playwright/test'
import { startTour } from './helpers'

test('H31: 앱을 열 때 연결이 안 되면 로그인 화면이 아니라 연결 안내 → 다시 시도하면 그대로 홈', async ({ page }) => {
  await startTour(page)
  await page.addInitScript(() => {
    window.__demoNetworkDown = true
  })
  await page.reload()

  await expect(page.getByRole('heading', { name: '인터넷 연결이 안 돼요' })).toBeVisible()
  await expect(page).not.toHaveURL(/\/welcome/)

  // 아직 끊긴 채로 다시 시도 → 같은 안내
  await page.getByRole('button', { name: '다시 시도' }).click()
  await expect(page.getByRole('heading', { name: '인터넷 연결이 안 돼요' })).toBeVisible()

  await page.evaluate(() => {
    window.__demoNetworkDown = false
  })
  await page.getByRole('button', { name: '다시 시도' }).click()
  await expect(page.getByRole('heading', { name: '김시작님' })).toBeVisible()
})

test('H31: 다시 연결되면(online) 누르지 않아도 저절로 이어진다', async ({ page }) => {
  await startTour(page)
  await page.addInitScript(() => {
    window.__demoNetworkDown = true
  })
  await page.reload()
  await expect(page.getByRole('heading', { name: '인터넷 연결이 안 돼요' })).toBeVisible()

  await page.evaluate(() => {
    window.__demoNetworkDown = false
    window.dispatchEvent(new Event('online'))
  })
  await expect(page.getByRole('heading', { name: '김시작님' })).toBeVisible()
})
