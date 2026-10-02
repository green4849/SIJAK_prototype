import { expect, test } from '@playwright/test'
import { mainNav, startTour } from './helpers'

test('④ 받은 친구 신청 수락 → 친구 수 증가', async ({ page }) => {
  await startTour(page)
  await mainNav(page).getByRole('link', { name: '친구' }).click()
  const received = page.getByRole('region', { name: /나에게 온 친구 신청/ })
  await expect(received.getByRole('article', { name: '박정호님' })).toBeVisible()
  await received.getByRole('button', { name: '수락하기' }).click()
  await expect(received).toHaveCount(0)

  await page.goto('/me')
  await expect(page.getByRole('link', { name: /내 친구 목록/ })).toContainText('3명')
})

test('④ 추천 친구에게 신청 → 버튼이 "신청했어요"로', async ({ page }) => {
  await startTour(page)
  await page.goto('/friends')
  const card = page.getByRole('article', { name: '김영희님' })
  await card.getByRole('button', { name: '친구 신청' }).click()
  await expect(card.getByRole('button', { name: /신청했어요/ })).toBeDisabled()
})

test('⑤ 대화: 보내면 이웃 답장이 폴링으로 도착', async ({ page }) => {
  await startTour(page)
  await page.goto('/chats')
  await page.getByRole('link', { name: /이순자님/ }).click()
  await expect(page.getByText('함께해요!')).toBeVisible()
  const before = await page.locator('main ol > li').count()

  await page.getByLabel('보낼 메시지').fill('내일 10시에 공원에서 만나요!')
  await page.getByRole('button', { name: '보내기' }).click()
  await expect(page.getByText('내일 10시에 공원에서 만나요!')).toBeVisible()
  // 데모 자동 답장 2.5초 + 폴링 3초
  await expect.poll(() => page.locator('main ol > li').count(), { timeout: 10_000 }).toBeGreaterThan(before + 1)
})

test('안전: 위험 대화 경고 → 신고 → 차단되면 입력줄이 안내로', async ({ page }) => {
  await startTour(page)
  await page.goto('/chats')
  await expect(page.getByRole('link', { name: /정덕수님/ })).toContainText('안 읽은 메시지')
  await page.getByRole('link', { name: /정덕수님/ }).click()

  const warning = page.getByRole('note', { name: '위험 경고' })
  await expect(warning).toContainText('잠깐만요! 조심하세요')
  await warning.getByRole('button', { name: '신고하기' }).click()
  const dialog = page.getByRole('dialog', { name: '정덕수님 신고하기' })
  await dialog.getByRole('radio', { name: '돈을 요구해요' }).click()
  await dialog.getByRole('button', { name: '신고하고 차단하기' }).click()
  await expect(page.getByText('차단된 대화예요')).toBeVisible()

  // 마이페이지에서 차단 풀기
  await page.goto('/me/blocks')
  await page.getByRole('button', { name: '차단 풀기' }).click()
  await expect(page.getByText('차단한 이웃이 없어요')).toBeVisible()
})
