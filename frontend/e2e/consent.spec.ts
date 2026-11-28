/** B6 약관·개인정보 동의 — 시연 (백엔드 같은 규칙은 backend tests/integration/test_consent_flow.py) */
import { expect, test, type Page } from '@playwright/test'
import { agreeTerms, startTour, verifyPhone } from './helpers'

test.use({ permissions: ['geolocation'], geolocation: { latitude: 37.2665, longitude: 127.0473 } })

test.beforeEach(async ({ page }) => {
  await page.route('https://nominatim.openstreetmap.org/**', (r) =>
    r.fulfill({ json: { address: { state: '경기도', city: '수원시', borough: '영통구', quarter: '매탄동' } } }),
  )
})

/** 마음 건강 기록(선택)만 빼고 가입 → 성향조사까지 */
async function signupWithoutHealth(page: Page) {
  await page.goto('/login/phone')
  await verifyPhone(page, { name: '선택안함', year: '1956', month: '6', day: '6', phone: '01055556666', gender: '여성' })
  await agreeTerms(page, { health: false })
  await page.getByRole('button', { name: '휴대폰 위치로 찾기' }).click()
  await expect(page.getByText('경기도 수원시 영통구 매탄동')).toBeVisible()
  await page.getByRole('button', { name: '가입 완료' }).click()
  await expect(page.getByRole('heading', { name: '나와 잘 맞는 동네 친구 찾기' })).toBeVisible()
}

test('선택(마음 건강 기록)을 빼도 가입되고, 점검 전에 동의를 따로 묻는다', async ({ page }) => {
  await signupWithoutHealth(page)
  // 마음 점검에 들어가면, 선택 동의하지 않은 분께 동의 카드를 먼저 보여 준다.
  await page.goto('/me/wellbeing/check/who5')
  await expect(page.getByRole('heading', { name: '점검 결과를 저장해도 될까요?' })).toBeVisible()
  await expect(page.getByText('나만 볼 수 있어요. 이웃·운영자에게 보여 주지 않아요.')).toBeVisible()
  await page.getByRole('button', { name: '동의하고 점검하기' }).click()
  await expect(page.getByRole('heading', { name: '최근 2주 동안의 기분을 같이 살펴볼까요?' })).toBeVisible()
})

test('마이페이지 → 약관 및 동의: 동의 상태·날짜, 문서 읽기, 마음 건강 동의 철회', async ({ page }) => {
  await startTour(page)
  await page.goto('/me')
  await page.getByRole('navigation', { name: '더 보기' }).getByRole('link', { name: '약관 및 동의' }).click()
  await expect(page.getByRole('heading', { name: '[필수] 서비스 이용약관' })).toBeVisible()
  await expect(page.getByText('동의함').first()).toBeVisible()

  // 마음 건강 기록 철회 → 확인 창 → 기록이 지워지고 '동의 안 함'
  await page.getByRole('button', { name: '동의 철회하기' }).click()
  const ask = page.getByRole('dialog', { name: '마음 건강 기록 동의를 철회할까요?' })
  await expect(ask).toContainText('되돌릴 수 없어요')
  await ask.getByRole('button', { name: '철회하고 기록 지우기' }).click()
  await expect(page.getByRole('button', { name: '동의하기' })).toBeVisible()
  await page.goto('/me/wellbeing/history')
  await expect(page.getByText('아직 살펴본 기록이 없어요.')).toBeVisible()

  // 점검을 열면 다시 묻는다
  await page.goto('/me/wellbeing/check/phq9')
  await expect(page.getByRole('heading', { name: '점검 결과를 저장해도 될까요?' })).toBeVisible()

  // 문서는 로그인 없이도 열리는 화면으로
  await page.goto('/me/consents')
  await page.getByRole('link', { name: '개인정보 처리방침 보기' }).click()
  await expect(page).toHaveURL(/\/legal\/policy$/)
  await expect(page.getByRole('heading', { name: '4. 처리 위탁과 국외 보관' })).toBeVisible()
})

test('약관이 바뀌면(버전이 다르면) 앱을 쓰기 전에 다시 동의를 받는다', async ({ page }) => {
  await startTour(page)
  // 시연 저장소에서 내 동의를 지난 버전으로 바꿔 둔다
  await page.evaluate(() => {
    const key = 'wipi.demo.v1'
    const s = JSON.parse(sessionStorage.getItem(key)!)
    const me = s.users.find((u: { id: string }) => u.id === s.me)
    me.consents = { terms: { version: '2020-01-01', agreed: true, at: '' } }
    sessionStorage.setItem(key, JSON.stringify(s))
  })
  await page.goto('/friends')
  await expect(page).toHaveURL(/\/consent$/)
  await expect(page.getByRole('heading', { name: '약관을 다시 확인해 주세요' })).toBeVisible()
  await page.getByRole('button', { name: '동의하고 계속하기' }).click()
  await expect(page.getByRole('alert')).toHaveText('[필수] 항목에 모두 동의해 주세요.')
  await page.getByRole('checkbox', { name: '모두 동의해요' }).check()
  await page.getByRole('button', { name: '동의하고 계속하기' }).click()
  await expect(page.getByRole('heading', { name: '김시작님' })).toBeVisible()
})

test('로그인 전 — 인증 화면에서 개인정보 처리방침을 읽을 수 있다', async ({ page }) => {
  await page.goto('/login/phone')
  await page.getByRole('link', { name: '개인정보 처리방침' }).click()
  await expect(page.getByRole('heading', { level: 1, name: '개인정보 처리방침' })).toBeVisible()
  await expect(page.getByText(/Neon — 데이터베이스 보관/).first()).toBeVisible()
})
