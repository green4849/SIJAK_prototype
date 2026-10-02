/** A2 — 위에서 지난 대화를 읽는 중이면 새 메시지가 와도 끌어내리지 않는다 */
import { expect, test, type Page } from '@playwright/test'
import { startTour } from './helpers'

const scrollY = (page: Page) => page.evaluate(() => window.scrollY)
const atBottom = (page: Page) =>
  page.evaluate(() => window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4)

async function openSunja(page: Page) {
  await startTour(page)
  await page.goto('/chats')
  await page.getByRole('link', { name: /이순자님/ }).click()
  await expect(page.getByText('함께해요!')).toBeVisible()
}

async function send(page: Page, text: string) {
  await page.getByLabel('보낼 메시지').fill(text)
  await page.getByRole('button', { name: '보내기' }).click()
  await expect(page.getByText(text)).toBeVisible()
}

test('A2: 읽는 중엔 그대로, "새 메시지 N개" 버튼으로 내려가기', async ({ page }) => {
  await openSunja(page)
  // 스크롤이 생길 만큼 대화를 쌓는다 (보낼 때마다 이웃이 2.5초 뒤 답장)
  for (let i = 1; i <= 4; i++) await send(page, `안부 인사 ${i}번째예요`)
  await expect(page.locator('main ol > li[data-mine="false"]')).toHaveCount(2 + 4, { timeout: 15_000 })
  expect(await atBottom(page)).toBe(true) // 맨 아래 근처에선 따라 내려감

  // 하나 더 보내고(내가 보내면 맨 아래) → 바로 맨 위로 올라가 읽는 중
  await send(page, '오늘 저녁은 뭐 드세요?')
  await page.evaluate(() => window.scrollTo(0, 0))
  const readingAt = await scrollY(page)

  // 답장이 와도 위치 유지 + 버튼 표시
  const button = page.getByRole('button', { name: /새 메시지 1개/ })
  await expect(button).toBeVisible({ timeout: 10_000 })
  expect(await scrollY(page)).toBe(readingAt)
  await page.screenshot({ path: 'test-results/a2-new-messages.png' })

  // 버튼을 누르면 맨 아래로, 버튼 사라짐
  await button.click()
  await expect.poll(() => atBottom(page)).toBe(true)
  await expect(button).toHaveCount(0)
})

test('A2: 내가 보내면 위에 있어도 맨 아래로', async ({ page }) => {
  await openSunja(page)
  for (let i = 1; i <= 3; i++) await send(page, `메시지 ${i}`)
  await page.evaluate(() => window.scrollTo(0, 0))
  await send(page, '제가 보낸 새 메시지')
  await expect.poll(() => atBottom(page)).toBe(true)

  // 마지막 말풍선이 아래 고정 입력줄에 가려지지 않는다 (처음 구현 때 실제로 가려졌던 버그)
  const last = await page.getByText('제가 보낸 새 메시지').boundingBox()
  const composer = await page.getByLabel('보낼 메시지').boundingBox()
  expect(last!.y + last!.height).toBeLessThanOrEqual(composer!.y)
})
