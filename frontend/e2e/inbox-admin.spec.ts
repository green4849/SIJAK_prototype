/** 알림함 · B3 회원 탈퇴 · B7 운영자 화면 — 화면·데모 (백엔드 없음) */
import { expect, test } from '@playwright/test'
import { startTour } from './helpers'

test('마이페이지 → 알림함: 새 소식 3개, 누르면 그 화면으로 가고 읽음 처리', async ({ page }) => {
  await startTour(page)
  await page.goto('/me')
  await expect(page.getByRole('link', { name: /알림함.*새 소식 3개/ })).toBeVisible()
  await page.getByRole('link', { name: /알림함/ }).click()
  await expect(page.getByText('새 소식', { exact: true })).toHaveCount(3)

  await page.getByRole('button', { name: /새 친구 신청/ }).click()
  await expect(page).toHaveURL(/\/friends$/)
  await page.goto('/notifications')
  await expect(page.getByText('새 소식', { exact: true })).toHaveCount(2)

  await page.getByRole('button', { name: '모두 읽음' }).click()
  await expect(page.getByText('새 소식', { exact: true })).toHaveCount(0)
})

test('회원 탈퇴 → 확인 → 로그아웃되어 시작 화면', async ({ page }) => {
  await startTour(page)
  await page.goto('/me')
  await page.getByRole('link', { name: '회원 탈퇴' }).click()
  await expect(page.getByText('30일 뒤 개인정보를 완전히 지워요')).toBeVisible()
  await page.getByRole('radio', { name: '다른 앱을 써요' }).click()
  await page.getByRole('button', { name: '탈퇴하기' }).click()
  await page.getByRole('dialog', { name: '정말 탈퇴할까요?' }).getByRole('button', { name: '네, 탈퇴할게요' }).click()
  await expect(page).toHaveURL(/\/welcome$/)
  await expect(page.getByText(/탈퇴했어요/)).toBeVisible()
})

test('운영자 화면: 신고 처리 → 이웃이 한 신고도 바로 들어온다, 돌봄이 필요한 이웃', async ({ page }) => {
  await startTour(page)
  await page.goto('/admin')
  await expect(page.getByText('처리 전 2건 · 전체 3건')).toBeVisible()
  const deoksu = page.getByRole('listitem', { name: '정덕수님 자동 감지' })
  await deoksu.getByRole('button', { name: '7일 정지' }).click()
  await expect(deoksu).toContainText('이용 정지')
  await expect(page.getByText('처리 전 1건 · 전체 3건')).toBeVisible()

  await page.getByRole('tab', { name: '돌봄이 필요한 이웃' }).click()
  await expect(page.getByText('최말순님')).toBeVisible()
  await expect(page.getByText('사회적 관계 지수 18')).toBeVisible()
})

test('운영자 화면 바로가기 링크(/admin?tour)', async ({ page }) => {
  await page.goto('/admin?tour')
  await expect(page.getByRole('heading', { name: '운영자 화면' })).toBeVisible()
  await expect(page).toHaveURL(/\/admin$/)
})
