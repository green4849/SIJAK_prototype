/** 마이페이지 '위치 다시 확인' — 이사했을 때 위치 동의를 다시 받고 사는 곳을 새로 고친다 */
import { expect, test } from '@playwright/test'
import { startTour } from './helpers'

test.use({ permissions: ['geolocation'], geolocation: { latitude: 35.1796, longitude: 129.0756 } })

test('위치 다시 확인 → 지금 위치의 시·도로 사는 곳이 바뀐다', async ({ page }) => {
  await page.route('https://nominatim.openstreetmap.org/**', (r) =>
    r.fulfill({ json: { address: { city: '부산광역시', borough: '연제구', quarter: '연산동' } } }),
  )
  await startTour(page)
  await page.goto('/me')
  const item = page.getByRole('button', { name: /위치 다시 확인/ })
  await expect(item).toContainText('경기도')
  await item.click()
  await expect(page.getByRole('status').filter({ hasText: '사는 곳을 부산광역시로 바꿨어요' })).toBeVisible()
  await expect(page.getByRole('button', { name: /위치 다시 확인/ })).toContainText('부산광역시')
})
