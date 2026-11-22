/** C11 마음 건강 · C10 긴급 도움·보호자 — 화면·데모 (백엔드 없음) */
import { expect, test } from '@playwright/test'
import { startTour } from './helpers'

test('마이페이지 → 마음 건강: 마음 날씨·요인·4주 변화, 기분 점검 9문항 → 결과', async ({ page }) => {
  await startTour(page)
  await page.goto('/me')
  await page.getByRole('link', { name: /마음 건강/ }).click()
  await expect(page.getByText('이번 주 마음 날씨')).toBeVisible()
  await expect(page.getByRole('heading', { name: '요즘 나는' })).toBeVisible()
  await expect(page.getByText(/3주 전 42 → 이번 주/)).toBeVisible()

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

test('외롭다는 이야기가 많아지면 마음 날씨가 나빠진다 (말동무 정서 → 사회적 관계 지수가 내려감)', async ({ page }) => {
  await startTour(page)
  await page.goto('/me/wellbeing')
  const before = Number((await page.getByText(/^사회적 관계 지수 \d+$/).textContent())!.match(/\d+/)![0])
  await page.goto('/companion')
  for (const t of ['너무 외로워요', '요즘 우울해요', '혼자라 쓸쓸해요']) {
    await page.getByLabel('말동무에게 할 말').fill(t)
    await page.getByRole('button', { name: '보내기' }).click()
    await expect(page.getByRole('list', { name: '말동무와 나눈 이야기' })).toContainText(t)
  }
  await page.goto('/me/wellbeing')
  const after = Number((await page.getByText(/^사회적 관계 지수 \d+$/).textContent())!.match(/\d+/)![0])
  expect(after).toBeLessThan(before)
})

test('홈 긴급 → 도움 요청 → 확인 → 보호자에게 알림', async ({ page }) => {
  await startTour(page)
  await page.getByRole('link', { name: '긴급' }).click()
  await expect(page.getByRole('heading', { name: '긴급 도움' })).toBeVisible()
  await expect(page.getByRole('link', { name: /119/ })).toHaveAttribute('href', 'tel:119')
  // 시연에서는 전화가 실제로 걸리지 않는다
  await page.getByRole('link', { name: /119/ }).click()
  await expect(page.getByText('시연 화면이라 전화는 걸리지 않아요')).toBeVisible()
  await expect(page).toHaveURL(/\/sos/)
  await page.getByRole('button', { name: '도움 요청' }).click()
  const sheet = page.getByRole('dialog', { name: '도움을 요청할까요?' })
  await expect(sheet).toContainText('김민수님 (아들)')
  await sheet.getByRole('button', { name: '알리기' }).click()
  // 시연에서는 보내지 않았다고 밝힌다
  await expect(page.getByRole('heading', { name: '시연이라 보내지 않았어요' })).toBeVisible()
  await expect(page.getByText('실제 앱에서는 이분들께 알려요.')).toBeVisible()
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
  await page.getByRole('dialog', { name: '김민지님을 보호자에서 뺄까요?' }).getByRole('button', { name: '빼기' }).click()
  await expect(page.getByText('010-****-2222')).toHaveCount(0)

  await page.goto('/companion')
  await page.getByLabel('말동무에게 할 말').fill('살기 싫어요')
  await page.getByRole('button', { name: '보내기' }).click()
  await page.getByRole('button', { name: '보호자에게 알리기' }).click()
  await expect(page.getByRole('note', { name: '도움받을 곳' }).getByText('시연이라 보내지 않았어요')).toBeVisible()
})

test('요즘 마음 — 말동무 대화 정서를 따로 보여 주고, 상태마다 할 일 하나로 이어 준다', async ({ page }) => {
  await startTour(page)
  await page.goto('/me/wellbeing')
  const mood = page.getByRole('region', { name: /요즘 마음/ })
  await expect(mood).toBeVisible()
  // 가장 낮은 요인에 '이번 주 해 볼 일'이 붙는다
  await expect(page.getByText(/이번 주 해 볼 일 · ‘.+’ 올리기/)).toBeVisible()

  await page.goto('/companion')
  for (const t of ['너무 외로워요', '요즘 우울해요', '혼자라 쓸쓸해요', '괜히 슬퍼요', '집이 적적해요']) {
    await page.getByLabel('말동무에게 할 말').fill(t)
    await page.getByRole('button', { name: '보내기' }).click()
    await expect(page.getByRole('list', { name: '말동무와 나눈 이야기' })).toContainText(t)
  }
  await page.goto('/me/wellbeing')
  await expect(mood.getByRole('heading', { name: '무거운 날이 많았어요' })).toBeVisible()
  await expect(mood).toContainText(/최근 2주 \d+번 중 \d+번은 마음이 무거웠어요/)
  await mood.getByRole('link', { name: '기분 점검 해 보기' }).click()
  await expect(page).toHaveURL(/\/me\/wellbeing\/check\/phq9/)

  // 위기 신호가 있었으면 다른 무엇보다 109
  await page.goto('/companion')
  await page.getByLabel('말동무에게 할 말').fill('살기 싫어요')
  await page.getByRole('button', { name: '보내기' }).click()
  await expect(page.getByRole('link', { name: '109 상담 전화하기' })).toBeVisible()
  await page.goto('/me/wellbeing')
  await expect(mood.getByRole('heading', { name: '많이 힘드셨어요' })).toBeVisible()
  await mood.getByRole('link', { name: '109 상담 전화 보기' }).click()
  await expect(page).toHaveURL(/\/sos$/)
})
