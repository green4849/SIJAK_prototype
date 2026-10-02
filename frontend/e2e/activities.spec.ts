import { expect, test } from '@playwright/test'
import { startTour } from './helpers'

test('⑥ 분류 탭 → ⑦ 상세 → 관심·신청 → ⑨ 개수 반영 → 취소', async ({ page }) => {
  await startTour(page)
  await page.getByRole('navigation', { name: '바로 가기' }).getByRole('link', { name: /지역생활/ }).click()

  await page.getByRole('tab', { name: '건강' }).click()
  await expect(page.getByRole('link', { name: /의자 요가/ })).toBeVisible()
  await expect(page.getByRole('link', { name: /노래 교실/ })).toHaveCount(0)

  await page.getByRole('link', { name: /의자 요가/ }).click()
  await expect(page.getByRole('heading', { name: '의자 요가' })).toBeVisible()
  await page.getByRole('button', { name: '관심', exact: true }).click()
  await expect(page.getByRole('button', { name: '관심', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: /신청하기/ }).click()
  await expect(page.getByText('신청했어요. 그날 만나요!')).toBeVisible()

  await page.goto('/me')
  await expect(page.getByRole('link', { name: /신청한 활동/ })).toContainText('2개')
  await expect(page.getByRole('link', { name: /관심 있는 활동/ })).toContainText('3개')

  await page.getByRole('link', { name: /신청한 활동/ }).click()
  await page.getByRole('link', { name: /의자 요가/ }).click()
  await page.getByRole('button', { name: '신청 취소하기' }).click()
  await expect(page.getByRole('button', { name: /신청하기/ })).toBeVisible()
})
