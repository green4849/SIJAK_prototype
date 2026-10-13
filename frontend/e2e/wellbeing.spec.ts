/** C11 마음 건강 · C10 긴급 도움·보호자 — 화면·데모 (백엔드 없음) */
import { expect, test } from '@playwright/test'
import { startTour } from './helpers'

test('마이페이지 → 마음 건강: 마음 날씨·요인·4주 변화, 기분 점검 9문항 → 결과', async ({ page }) => {
  await startTour(page)
  await page.goto('/me')
  await page.getByRole('link', { name: /마음 건강/ }).click()
  await expect(page.getByText('이번 주 마음 날씨')).toBeVisible()
  await expect(page.getByRole('heading', { name: '요즘 나는' })).toBeVisible()
  await expect(page.getByText(/3주 전 58 → 이번 주/)).toBeVisible()

  await page.getByRole('link', { name: /기분 점검/ }).click()
  for (let i = 1; i <= 9; i++) {
    await expect(page.getByText(`${i} / 9`)).toBeVisible()
    await page.getByRole('button', { name: '며칠 있었어요' }).click()
  }
  await expect(page.getByRole('heading', { name: '조금 지쳐 있어요' })).toBeVisible()
  await expect(page.getByText('점수 9 / 27')).toBeVisible()
  // 9번(죽음·자해 생각)에 '있음' → 상담 전화 안내
  await expect(page.getByRole('link', { name: '109 상담 전화하기' })).toBeVisible()
  await page.getByRole('link', { name: '확인' }).click()
  await expect(page.getByText(/지난번: 조금 지쳐 있어요/).first()).toBeVisible()
})

test('외롭다는 이야기가 많아지면 마음 날씨가 나빠진다 (말동무 정서 → 고립 지수)', async ({ page }) => {
  await startTour(page)
  await page.goto('/me/wellbeing')
  const before = Number((await page.getByText(/^고립 지수 \d+$/).textContent())!.match(/\d+/)![0])
  await page.goto('/companion')
  for (const t of ['너무 외로워요', '요즘 우울해요', '혼자라 쓸쓸해요']) {
    await page.getByLabel('말동무에게 할 말').fill(t)
    await page.getByRole('button', { name: '보내기' }).click()
    await expect(page.getByRole('list', { name: '말동무와 나눈 이야기' })).toContainText(t)
  }
  await page.goto('/me/wellbeing')
  const after = Number((await page.getByText(/^고립 지수 \d+$/).textContent())!.match(/\d+/)![0])
  expect(after).toBeGreaterThan(before)
})

test('홈 긴급 → 도움 요청 → 확인 → 보호자에게 알림', async ({ page }) => {
  await startTour(page)
  await page.getByRole('link', { name: '긴급' }).click()
  await expect(page.getByRole('heading', { name: '긴급 도움' })).toBeVisible()
  await expect(page.getByRole('link', { name: /119/ })).toHaveAttribute('href', 'tel:119')
  await page.getByRole('button', { name: '도움 요청' }).click()
  const sheet = page.getByRole('dialog', { name: '도움을 요청할까요?' })
  await expect(sheet).toContainText('김민수님 (아들)')
  await sheet.getByRole('button', { name: '알리기' }).click()
  await expect(page.getByRole('heading', { name: '알렸어요' })).toBeVisible()
})

test('보호자 추가·빼기, 말동무 위기 안내에서 보호자에게 알리기', async ({ page }) => {
  await startTour(page)
  await page.goto('/me/guardians')
  await page.getByRole('button', { name: '보호자 추가' }).click()
  await page.getByLabel('이름').fill('김민지')
  await page.getByRole('radio', { name: '딸' }).click()
  await page.getByLabel('휴대전화 번호').fill('01011112222')
  await page.getByRole('button', { name: '등록하기' }).click()
  await expect(page.getByText('010-****-2222')).toBeVisible()
  // 3명이 되면 더 추가할 수 없다
  await expect(page.getByRole('button', { name: '보호자 추가' })).toHaveCount(0)
  await page.getByRole('button', { name: '김민지님 빼기' }).click()
  await expect(page.getByText('010-****-2222')).toHaveCount(0)

  await page.goto('/companion')
  await page.getByLabel('말동무에게 할 말').fill('살기 싫어요')
  await page.getByRole('button', { name: '보내기' }).click()
  await page.getByRole('button', { name: '보호자에게 알리기' }).click()
  await expect(page.getByText('보호자에게 알렸어요')).toBeVisible()
})
