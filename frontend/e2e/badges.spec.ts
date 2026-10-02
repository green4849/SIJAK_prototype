/** A1 — 하단 탭·홈 카드 배지 (시드: 안 읽은 메시지 1개, 받은 친구 신청 1개) */
import { expect, test } from '@playwright/test'
import { mainNav, startTour } from './helpers'

test('A1 배지: 화면 낭독기 문장 포함, 읽거나 수락하면 바로 사라짐', async ({ page }) => {
  await startTour(page)
  const cards = page.getByRole('navigation', { name: '바로 가기' })

  // 숫자만이 아니라 문장으로, '이름 → 배지' 순서로 읽힌다
  await expect(cards.getByRole('link', { name: /^대화하기\s?, 안 읽은 메시지 1개/ })).toBeVisible()
  await expect(cards.getByRole('link', { name: /^친구 찾기\s?, 새 친구 신청 1개/ })).toBeVisible()
  await expect(mainNav(page).getByRole('link', { name: /^친구\s?, 새 친구 신청 1개$/ })).toBeVisible()
  await expect(mainNav(page).getByRole('link', { name: /^홈\s?, 안 읽은 메시지 1개$/ })).toBeVisible()

  // 대화를 읽고 돌아오면 배지가 사라짐 (다음 주기까지 기다리지 않음)
  await cards.getByRole('link', { name: /대화하기/ }).click()
  await page.getByRole('link', { name: /정덕수님/ }).click()
  await expect(page.getByRole('note', { name: '위험 경고' })).toBeVisible()
  await page.getByRole('button', { name: '뒤로' }).click()
  await page.goto('/')
  await expect(cards.getByRole('link', { name: /대화하기/ })).not.toContainText('안 읽은 메시지')
  await expect(mainNav(page).getByRole('link', { name: '홈' })).toBeVisible()

  // 친구 신청을 수락하면 친구 탭 배지가 바로 사라짐
  await mainNav(page).getByRole('link', { name: /친구/ }).click()
  await page.getByRole('region', { name: /나에게 온 친구 신청/ }).getByRole('button', { name: '수락하기' }).click()
  await expect(mainNav(page).getByRole('link', { name: '친구', exact: true })).toBeVisible()
})

test('A1 배지: 화면 확인용 스크린샷', async ({ page }) => {
  await startTour(page)
  await expect(page.getByRole('link', { name: /^대화하기\s?, 안 읽은/ })).toBeVisible()
  await page.screenshot({ path: 'test-results/a1-home-badges.png' })
})

test('A1 배지: 같은 값을 4곳(카드 2 + 탭 2)에서 써도 요청은 한 번', async ({ page }) => {
  await startTour(page)
  await page.reload() // 호출 수를 처음부터 센다
  await expect(page.getByRole('heading', { name: '김시작님' })).toBeVisible()
  await page.waitForTimeout(1500)
  const calls = await page.evaluate(() => window.__demoCalls ?? {})
  expect(calls['GET /chats']).toBe(1)
  expect(calls['GET /friends/requests']).toBe(1)
})
