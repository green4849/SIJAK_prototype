import { expect, test } from '@playwright/test'
import { startTour } from './helpers'

test('시작이가 현재 화면의 질문을 제안하고 해당 화면으로 안내한다', async ({ page }) => {
  await startTour(page)
  await page.getByRole('button', { name: '시작이에게 앱 사용법 물어보기' }).click()
  await expect(page.getByRole('heading', { name: '시작이에게 물어보기' })).toBeVisible()
  await page.getByRole('button', { name: '친구는 어떻게 찾나요?' }).click()
  await expect(page.getByRole('status')).toContainText('추천 친구와 같은 동네 이웃')
  await page.getByRole('link', { name: '친구 찾기 →' }).click()
  await expect(page).toHaveURL(/\/friends$/)
  await expect(page.getByRole('heading', { name: '동네 친구 찾기' })).toBeVisible()
})

test('모르는 질문에는 추측하지 않고 도움말로 연결한다', async ({ page }) => {
  await startTour(page)
  await page.getByRole('button', { name: '시작이에게 앱 사용법 물어보기' }).click()
  await page.getByLabel('궁금한 점을 직접 적어 주세요').fill('오늘 날씨가 어떨까?')
  await page.getByRole('button', { name: '묻기' }).click()
  await expect(page.getByRole('status')).toContainText('정확히 안내하기 어려워요')
  await page.getByRole('link', { name: '도움말 보기 →' }).click()
  await expect(page).toHaveURL(/\/me\/help$/)
})

test('로그인 화면에서도 시작이에게 인증 도움을 물을 수 있다', async ({ page }) => {
  await page.goto('/welcome')
  await page.getByRole('button', { name: '시작이에게 앱 사용법 물어보기' }).click()
  await page.getByLabel('궁금한 점을 직접 적어 주세요').fill('인증번호가 오지 않아요')
  await page.getByRole('button', { name: '묻기' }).click()
  await expect(page.getByRole('status')).toContainText('다시 받기')
  await page.getByRole('link', { name: '로그인 도움받기 →' }).click()
  await expect(page).toHaveURL(/\/login\/help$/)
})
