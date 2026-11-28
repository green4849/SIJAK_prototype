/** C4 휴대폰 알림 — 설정 화면 안내 (실제 발송·구독은 backend tests/integration/test_push_flow.py) */
import { expect, test } from '@playwright/test'
import { startTour } from './helpers'

test('설정 → 휴대폰 알림: 시연은 서버가 없어 준비 중 안내, 추천 알림 설정은 그대로', async ({ page }) => {
  await startTour(page)
  await page.goto('/me/settings')
  const card = page.getByRole('region', { name: '휴대폰 알림' })
  await expect(card).toContainText('휴대폰 알림은 준비 중이에요. 그동안 새 소식은 알림함에서 볼 수 있어요.')
  await expect(card.getByRole('switch')).toHaveCount(0)
  await expect(page.getByRole('switch', { name: '추천 친구 알림' })).toBeVisible()
})

test('휴대폰 알림: 알림을 못 받는 브라우저는 다른 브라우저를 권한다', async ({ page }) => {
  await page.addInitScript(() => {
    // @ts-expect-error 이 브라우저에 Web Push 가 없는 것처럼
    delete window.PushManager
  })
  await startTour(page)
  await page.goto('/me/settings')
  await expect(page.getByRole('region', { name: '휴대폰 알림' })).toContainText(
    '이 브라우저에서는 휴대폰 알림을 받을 수 없어요. 크롬이나 삼성 인터넷에서 열어 보세요.',
  )
})

test.describe('아이폰 사파리', () => {
  test.use({
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1',
  })

  test('홈 화면에 추가해야 받을 수 있다고 알려 준다', async ({ page }) => {
    await page.addInitScript(() => {
      // 아이폰 사파리는 홈 화면 앱이 아니면 Web Push 가 없다
      // @ts-expect-error 흉내
      delete window.PushManager
    })
    await startTour(page)
    await page.goto('/me/settings')
    await expect(page.getByRole('region', { name: '휴대폰 알림' })).toContainText("'홈 화면에 추가'한 시작 앱에서")
  })
})
