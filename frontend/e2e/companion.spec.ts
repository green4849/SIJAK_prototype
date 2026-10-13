/** C8 AI 말동무 — 화면·데모 (백엔드 없음): 이어지는 대화, 활동 추천, 말로 하기, 가드레일 */
import { expect, test } from '@playwright/test'
import { startTour } from './helpers'

test('홈 → 말동무: 어제 이야기가 이어지고, 외롭다고 하면 동네 활동을 권한다', async ({ page }) => {
  await startTour(page)
  await page.getByRole('link', { name: '말동무' }).click()
  await expect(page.getByRole('heading', { name: '말동무' })).toBeVisible()
  const talk = page.getByRole('list', { name: '말동무와 나눈 이야기' })
  await expect(talk).toContainText('된장찌개')
  await expect(talk).toContainText('오늘은 무엇을 하실 계획이에요?')

  await page.getByLabel('말동무에게 할 말').fill('요즘 좀 외로워요')
  await page.getByRole('button', { name: '보내기' }).click()
  await expect(talk).toContainText('요즘 좀 외로워요')
  const suggestion = talk.getByRole('link', { name: /모임|교실|요가|상영회|교육|나눔|줍기|차 모임/ }).last()
  await expect(suggestion).toBeVisible()
  await suggestion.click()
  await expect(page).toHaveURL(/\/activities\//)
})

test('말로 하기 → 받아쓴 말과 답이 생긴다', async ({ page }) => {
  await startTour(page)
  await page.goto('/companion')
  await page.getByRole('button', { name: '말로 하기' }).click()
  await expect(page.getByText('듣고 있어요')).toBeVisible()
  await page.getByRole('button', { name: '다 말했어요' }).click()
  const talk = page.getByRole('list', { name: '말동무와 나눈 이야기' })
  await expect(talk).toContainText('비가 와서 마음이 좀 가라앉네요')
  await expect(talk.getByRole('img', { name: '말로 함' }).last()).toBeVisible()
})

test('가드레일 — 아프다고 하면 의사 상담을, 위기 신호에는 상담 전화를 안내한다', async ({ page }) => {
  await startTour(page)
  await page.goto('/companion')
  const talk = page.getByRole('list', { name: '말동무와 나눈 이야기' })

  await page.getByLabel('말동무에게 할 말').fill('무릎이 너무 아파요')
  await page.getByRole('button', { name: '보내기' }).click()
  await expect(talk).toContainText('의사 선생님께')

  await page.getByLabel('말동무에게 할 말').fill('그냥 다 끝내고 싶어요')
  await page.getByRole('button', { name: '보내기' }).click()
  await expect(talk.getByRole('link', { name: '109 상담 전화하기' })).toHaveAttribute('href', 'tel:109')
})

test('시작 버튼으로 바로 말 걸기', async ({ page }) => {
  await startTour(page)
  await page.goto('/companion')
  await page.getByRole('group', { name: '이렇게 말해 보세요' }).getByRole('button', { name: '옛날 이야기 하고 싶어요' }).click()
  await expect(page.getByRole('list', { name: '말동무와 나눈 이야기' })).toContainText('그 시절 이야기')
})
