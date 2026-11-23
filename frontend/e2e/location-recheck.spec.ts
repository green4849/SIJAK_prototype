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
  await expect(item).toContainText('오산시 세마동')
  await item.click()
  await expect(page.getByRole('status').filter({ hasText: '사는 곳을 부산광역시로 바꿨어요' })).toBeVisible()
  await expect(page.getByRole('button', { name: /위치 다시 확인/ })).toContainText('부산광역시')
})

test('오산 밖으로 옮기면 지역생활에 시연 기준을 밝히고, 자리표시(○○) 장소는 없다', async ({ page }) => {
  await page.route('https://nominatim.openstreetmap.org/**', (r) =>
    r.fulfill({ json: { address: { city: '부산광역시', borough: '연제구', quarter: '연산동' } } }),
  )
  await startTour(page)
  await page.goto('/activities')
  await expect(page.getByText(/시연 활동은 오산시 양산동 기준이에요/)).toHaveCount(0)
  await page.goto('/me')
  await page.getByRole('button', { name: /위치 다시 확인/ }).click()
  await expect(page.getByRole('status').filter({ hasText: '부산광역시로 바꿨어요' })).toBeVisible()
  await page.goto('/activities')
  await expect(page.getByText('시연 활동은 오산시 양산동 기준이에요. 실제 앱에서는 사시는 동네의 활동이 나와요.')).toBeVisible()
  await expect(page.getByRole('link', { name: /건강 걷기 모임/ })).toBeVisible()
  await expect(page.locator('main')).not.toContainText('○○')
})
