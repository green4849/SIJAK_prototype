/** A4 — 동작 후 피드백: 토스트(화면 낭독 포함) + 진동(설정으로 끄기) */
import { expect, test, type Page } from '@playwright/test'
import { mainNav, startTour } from './helpers'

const toastOf = (page: Page) => page.getByRole('status').getByRole('button', { name: /누르면 닫혀요/ })

/** navigator.vibrate 호출 기록 */
async function recordVibration(page: Page) {
  await page.addInitScript(() => {
    ;(window as unknown as { __vibrations: unknown[] }).__vibrations = []
    navigator.vibrate = ((p: unknown) => {
      ;(window as unknown as { __vibrations: unknown[] }).__vibrations.push(p)
      return true
    }) as Navigator['vibrate']
  })
}
const vibrations = (page: Page) =>
  page.evaluate(() => (window as unknown as { __vibrations: unknown[] }).__vibrations.length)

test('A4: 친구 수락·활동 신청 후 토스트 + 진동, 쌓이지 않음', async ({ page }) => {
  await recordVibration(page)
  await startTour(page)

  await mainNav(page).getByRole('link', { name: /친구/ }).click()
  await page.getByRole('region', { name: /나에게 온 친구 신청/ }).getByRole('button', { name: '수락하기' }).click()
  await expect(toastOf(page)).toContainText('박정호님과 친구가 됐어요')
  expect(await vibrations(page)).toBe(1)

  // 다음 동작의 토스트가 이전 것을 바꿔치기 (하나만)
  await page.getByRole('article', { name: '김영희님' }).getByRole('button', { name: '친구 신청' }).click()
  await expect(toastOf(page)).toHaveCount(1)
  await expect(toastOf(page)).toContainText('김영희님께 친구 신청을 보냈어요')

  // 누르면 바로 닫힘
  // 하단 탭도 가리지 않는다
  const t = await toastOf(page).boundingBox()
  const nav = await mainNav(page).boundingBox()
  expect(t!.y + t!.height).toBeLessThanOrEqual(nav!.y)
  await toastOf(page).click()
  await expect(toastOf(page)).toHaveCount(0)

  await page.goto('/activities')
  await page.getByRole('link', { name: /의자 요가/ }).click()
  await page.getByRole('button', { name: /신청하기/ }).click()
  await expect(toastOf(page)).toContainText("'의자 요가' 신청했어요")
  // 하단 신청 영역(신청 완료 문구 포함)을 가리지 않는다
  await expect(page.getByText('신청했어요. 그날 만나요!')).toBeVisible()
  await expect
    .poll(async () => {
      const t = await toastOf(page).boundingBox()
      const bar = await page.locator('[data-bottom-bar]').first().boundingBox()
      return t && bar ? t.y + t.height <= bar.y : false
    })
    .toBe(true)
})

test('A4: 설정에서 진동을 끄면 토스트만', async ({ page }) => {
  await recordVibration(page)
  await startTour(page)
  await page.goto('/me/settings')
  await page.getByRole('radio', { name: '끄기' }).click()

  await page.goto('/friends')
  await page.getByRole('article', { name: '김영희님' }).getByRole('button', { name: '친구 신청' }).click()
  await expect(toastOf(page)).toBeVisible()
  expect(await vibrations(page)).toBe(0)
})

test('A4: 토스트는 4초 뒤 사라진다', async ({ page }) => {
  await startTour(page)
  await page.goto('/friends')
  await page.getByRole('article', { name: '김영희님' }).getByRole('button', { name: '친구 신청' }).click()
  await expect(toastOf(page)).toBeVisible()
  await expect(toastOf(page)).toHaveCount(0, { timeout: 6000 })
})
