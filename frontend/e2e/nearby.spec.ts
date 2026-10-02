/** C3 — 같은 동네: 위치 동의 → 반경 2km 이웃을 가까운 순으로, 대략 거리와 함께 */
import { expect, test } from '@playwright/test'
import { startTour } from './helpers'

test.use({ permissions: ['geolocation'], geolocation: { latitude: 37.2701, longitude: 127.0099 } })

test('C3: 위치를 알리면 같은 동네 이웃이 거리와 함께', async ({ page }) => {
  await startTour(page)
  await page.goto('/friends')
  await page.getByRole('tab', { name: '같은 동네' }).click()

  // 위치를 아직 안 알림 → 동의 카드 + 같은 시·도 이웃(거리 없음)
  await page.getByRole('button', { name: '내 위치 사용하기' }).click()
  await expect(page.getByRole('status').filter({ hasText: '동네 정도로만 저장했어요' })).toBeVisible()
  await expect(page.getByRole('button', { name: '내 위치 사용하기' })).toHaveCount(0)

  // 가까운 순 (박정호·김영희 약 1.5km), 그 뒤 위치를 안 알린 최말순(지역명)
  const cards = page.getByRole('region', { name: '같은 동네 이웃 목록' }).getByRole('article')
  await expect(cards.nth(0)).toContainText('약 1.5km')
  await expect(cards.filter({ hasText: '최말순' })).toContainText('경기도')
  const names = await cards.evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')))
  expect(names.indexOf('최말순님')).toBe(names.length - 1)
  // 반경 밖·다른 지역은 없음
  expect(names).not.toContain('한옥자님')
})
