/** A16 — 데모 안내 띠 없음, 링크 파라미터(?tour / ?reset)로 둘러보기 */
import { expect, test } from '@playwright/test'
import { mainNav, startTour } from './helpers'

test('A16: 그냥 링크는 시작 화면부터, 안내 띠 없음', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('link', { name: '시작하기' })).toBeVisible()
  await expect(page.getByText('데모 화면이에요')).toHaveCount(0)
})

test('A16: ?tour 로 김시작 계정 홈, 주소창에서 파라미터 지움', async ({ page }) => {
  await startTour(page)
  await expect(page.getByText('데모 화면이에요')).toHaveCount(0)
  await expect.poll(() => new URL(page.url()).search).toBe('')
})

test('A16: ?reset 으로 이 탭 데이터 처음 상태로', async ({ page }) => {
  await startTour(page)
  await mainNav(page).getByRole('link', { name: /친구/ }).click()
  await page.getByRole('region', { name: /나에게 온 친구 신청/ }).getByRole('button', { name: '수락하기' }).click()
  await expect(page.getByRole('region', { name: /나에게 온 친구 신청/ })).toHaveCount(0)

  await page.goto('/?reset')
  await expect(page.getByRole('link', { name: '시작하기' })).toBeVisible() // 로그아웃된 처음 상태
  await expect.poll(() => new URL(page.url()).search).toBe('')
  await startTour(page)
  await page.goto('/friends')
  await expect(page.getByRole('region', { name: /나에게 온 친구 신청/ })).toBeVisible()
})
