import { expect, test } from '@playwright/test'
import { verifyPhone } from './helpers'

test('① 시작 → ② 휴대폰 인증 → 가입 → ⑧ 보안 안내 → ③ 홈', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveURL(/\/welcome$/)
  await page.getByRole('link', { name: '시작하기' }).click()
  await page.getByRole('link', { name: /휴대폰 인증/ }).click()

  // 클라이언트 검증: 빈 채로 누르면 안내, 고치기 시작하면 사라짐
  await page.getByRole('button', { name: '인증번호 받기' }).click()
  await expect(page.getByRole('alert')).toHaveText('이름을 적어 주세요.')
  await page.getByLabel('이름').fill('홍')
  await expect(page.getByRole('alert')).toHaveCount(0)

  await verifyPhone(page, { name: '홍길순', year: '1957', month: '7', day: '7', phone: '01077778888', gender: '여성' })
  await expect(page).toHaveURL(/\/signup$/)
  await page.getByRole('radio', { name: '경기도' }).click()
  await page.getByRole('button', { name: '요리' }).click()
  await page.getByRole('button', { name: '가입 완료' }).click()

  await expect(page.getByRole('heading', { name: '안전한 시작을 약속합니다' })).toBeVisible()
  await expect(page.getByRole('button', { name: '뒤로' })).toHaveCount(0) // 가입 직후엔 뒤로 없음
  await page.getByRole('link', { name: '알겠어요, 시작할게요' }).click()
  await expect(page.getByRole('heading', { name: '홍길순님' })).toBeVisible()
})

test('관심사는 5개까지 — 넘으면 이유를 알려 준다', async ({ page }) => {
  await page.goto('/login/phone')
  await verifyPhone(page, { name: '이관심', year: '1955', month: '1', day: '1', phone: '01066665555', gender: '남성' })
  for (const i of ['산책·등산', '노래·음악', '요리', '여행', '건강·운동', '바둑·장기'])
    await page.getByRole('button', { name: i }).click()
  await expect(page.locator('[aria-pressed=true]')).toHaveCount(5)
  await expect(page.getByRole('alert')).toContainText('5개까지 고를 수 있어요')
})

test('신분증·도움받기 안내 화면', async ({ page }) => {
  await page.goto('/login')
  await page.getByRole('link', { name: /신분증 인증/ }).click()
  await expect(page.getByRole('heading', { name: '신분증 인증은 준비 중이에요' })).toBeVisible()
  await page.getByRole('link', { name: '도움받기' }).click()
  await expect(page.getByRole('heading', { name: '함께 해요' })).toBeVisible()
})
