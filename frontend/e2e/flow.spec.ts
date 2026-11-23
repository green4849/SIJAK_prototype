import { expect, test } from '@playwright/test'
import { startTour } from './helpers'

test('홈 ‘다음 모임’ → 활동 상세 → ‘뒤로’는 들어온 홈으로', async ({ page }) => {
  await startTour(page)
  const next = page.getByRole('region', { name: '다음 모임' })
  await expect(next).toContainText('건강 걷기 모임')
  await next.getByRole('link').click()
  await expect(page.getByRole('heading', { name: '건강 걷기 모임' })).toBeVisible()
  await page.getByRole('button', { name: '뒤로' }).click()
  await expect(page.getByRole('heading', { name: '김시작님' })).toBeVisible()
})

test('‘뒤로’ — 주소로 바로 열면 정해 둔 곳으로, 기록을 쌓지 않는다', async ({ page }) => {
  await startTour(page)
  await page.goto('/me/points') // 앱 안의 앞 화면이 없는 상태
  await page.getByRole('button', { name: '뒤로' }).click()
  await expect(page).toHaveURL(/\/me$/)
  await page.goBack() // 휴대폰 '뒤로' — 방금 나온 포인트 화면으로 되돌아가지 않는다
  await expect(page).not.toHaveURL(/\/me\/points$/)
})

test('인증번호 단계의 ‘뒤로’는 한 단계만 — 적어 둔 정보가 남는다', async ({ page }) => {
  await page.goto('/login/phone')
  await page.getByLabel('이름').fill('홍길순')
  await page.getByLabel('년', { exact: true }).fill('1957')
  await page.getByLabel('월', { exact: true }).fill('7')
  await page.getByLabel('일', { exact: true }).fill('7')
  await page.getByLabel('휴대전화 번호').fill('01077778888')
  await page.getByRole('radio', { name: '여성' }).click()
  await page.getByRole('button', { name: '인증번호 받기' }).click()
  await expect(page.getByLabel('인증번호')).toBeVisible()
  await page.getByRole('button', { name: '뒤로' }).click()
  await expect(page).toHaveURL(/\/login\/phone$/)
  await expect(page.getByLabel('이름')).toHaveValue('홍길순')
})

test('겹치는 취미가 없는 추천 이웃에게도 추천 이유가 보인다', async ({ page }) => {
  await startTour(page)
  await page.goto('/friends')
  const malsun = page.getByRole('article', { name: '최말순님' })
  await expect(malsun).toContainText(/이웃이라 추천했어요/)
})
