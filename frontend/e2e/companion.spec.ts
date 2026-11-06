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

/** 브라우저 음성 인식 흉내 — start() 뒤 말한 것처럼 중간 글 → 최종 글을 차례로 */
function fakeRecognition(phrases: string[]) {
  class FakeRecognition {
    lang = ''
    continuous = false
    interimResults = false
    onresult: ((e: unknown) => void) | null = null
    onerror: ((e: unknown) => void) | null = null
    onend: (() => void) | null = null
    start() {
      phrases.forEach((_, i) =>
        setTimeout(() => {
          const results = { length: 1, 0: { 0: { transcript: phrases[i] } } }
          this.onresult?.({ results })
        }, 200 * (i + 1)),
      )
    }
    stop() {}
    abort() {}
  }
  // 최신 크롬은 접두어 없는 SpeechRecognition 도 있다 → 둘 다 바꿔 둔다
  const w = window as unknown as Record<string, unknown>
  w.SpeechRecognition = FakeRecognition
  w.webkitSpeechRecognition = FakeRecognition
}

test('말로 하기 → 알아들은 말이 화면에 보이고, 그 말로 답한다', async ({ page }) => {
  await page.addInitScript(fakeRecognition, ['요즘 좀', '요즘 좀 외로워요'])
  await startTour(page)
  await page.goto('/companion')
  await page.getByRole('button', { name: '말로 하기' }).click()
  await expect(page.getByText('듣고 있어요')).toBeVisible()
  await expect(page.getByText('요즘 좀 외로워요', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: '다 말했어요' }).click()
  const talk = page.getByRole('list', { name: '말동무와 나눈 이야기' })
  await expect(talk).toContainText('요즘 좀 외로워요')
  await expect(talk.getByRole('img', { name: '말로 함' }).last()).toBeVisible()
  await expect(talk).toContainText('그런 날이 있지요')
})

test('말로 하기 — 아무 말도 못 알아들으면 다시 말해 달라고 한다', async ({ page }) => {
  await page.addInitScript(fakeRecognition, [])
  await startTour(page)
  await page.goto('/companion')
  await page.getByRole('button', { name: '말로 하기' }).click()
  await page.getByRole('button', { name: '다 말했어요' }).click()
  await expect(page.getByText('잘 못 들었어요. 한 번 더 말씀해 주세요.')).toBeVisible()
  await expect(page.getByText('듣고 있어요')).toBeVisible()
})

test('말로 하기 — 음성 인식이 없는 기기는 시연 문장으로 대신한다', async ({ page }) => {
  await page.addInitScript(() => {
    const w = window as unknown as Record<string, unknown>
    delete w.webkitSpeechRecognition
    delete w.SpeechRecognition
  })
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
