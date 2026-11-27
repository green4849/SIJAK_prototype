/**
 * 화면 캡처 — 디자인 점검용 (기본 실행에서는 건너뜀).
 *   SCREENS=1 SCREENS_DIR=out npx playwright test e2e/screens.spec.ts
 * 390px 폭(디자인 프레임 기준) · 글자 크기 1단계 / 4단계, 태블릿 820px(1단계) 세 벌.
 * 파일 이름 앞: 1-/4- (휴대폰 글자 단계), t- (태블릿)
 */
import { expect, test, type Page } from '@playwright/test'
import { startTour } from './helpers'

test.skip(!process.env.SCREENS, 'SCREENS=1 일 때만')
test.use({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })

const dir = process.env.SCREENS_DIR ?? 'test-results/screens'

async function shot(page: Page, name: string) {
  await page.waitForLoadState('networkidle')
  await page.evaluate(() => document.fonts.ready)
  await page.screenshot({ path: `${dir}/${name}.png`, fullPage: true })
}

const RUNS = [
  { prefix: '1', scale: '1', width: 390 },
  { prefix: '4', scale: '4', width: 390 },
  { prefix: 't', scale: '1', width: 820 },
]

for (const { prefix, scale, width } of RUNS) {
  test(`화면 캡처 (${prefix})`, async ({ page }) => {
    test.setTimeout(90_000)
    await page.setViewportSize({ width, height: width > 600 ? 1180 : 844 })
    await page.addInitScript((s) => {
      const k = 'wipi.a11y'
      const cur = JSON.parse(localStorage.getItem(k) ?? '{}')
      localStorage.setItem(k, JSON.stringify({ ...cur, fontScale: Number(s) }))
    }, scale)
    const p = (n: string) => `${prefix}-${n}`

    await page.goto('/welcome')
    await shot(page, p('01-welcome'))
    await page.goto('/login')
    await shot(page, p('02-login'))

    await startTour(page)
    await shot(page, p('03-home'))
    await page.goto('/friends')
    await expect(page.getByRole('article').first()).toBeVisible()
    await shot(page, p('04-friends'))
    await page.goto('/chats')
    await page.getByRole('link').filter({ hasText: '님' }).first().click()
    await expect(page.getByRole('textbox')).toBeVisible()
    await shot(page, p('05-chat'))
    await page.goto('/activities')
    await shot(page, p('06-activities'))
    await page.getByRole('link', { name: /의자 요가/ }).click()
    await expect(page.getByRole('heading', { name: '의자 요가' })).toBeVisible()
    await shot(page, p('07-activity'))
    await page.goto('/safety')
    await shot(page, p('08-safety'))
    await page.goto('/me')
    await expect(page.getByRole('heading', { name: '마이페이지' })).toBeVisible()
    await shot(page, p('09-me'))
  })
}

/** 마음 건강 살펴보기(WHO-5) — 기본 390px / 글자 4단계는 가장 좁은 320px */
const WHO5_RUNS = [
  { prefix: 'w1', scale: '1', width: 390 },
  { prefix: 'w4', scale: '4', width: 320 },
]

for (const { prefix, scale, width } of WHO5_RUNS) {
  test(`화면 캡처 WHO-5 (${prefix})`, async ({ page }) => {
    test.setTimeout(90_000)
    await page.setViewportSize({ width, height: 844 })
    await page.addInitScript((s) => {
      const k = 'wipi.a11y'
      const cur = JSON.parse(localStorage.getItem(k) ?? '{}')
      localStorage.setItem(k, JSON.stringify({ ...cur, fontScale: Number(s) }))
    }, scale)
    const p = (n: string) => `${prefix}-${n}`

    await startTour(page)
    await shot(page, p('01-home-card'))
    await page.getByRole('link', { name: /마음 건강 살펴볼 때예요/ }).click()
    await expect(page.getByRole('button', { name: '시작하기' })).toBeVisible()
    await shot(page, p('02-intro'))
    await page.getByRole('button', { name: '시작하기' }).click()
    await page.getByRole('radio', { name: '절반 이상' }).click()
    await shot(page, p('03-question'))
    for (let i = 1; i <= 5; i++) {
      if (i > 1) await page.getByRole('radio', { name: '가끔' }).click()
      await page.getByRole('button', { name: i === 5 ? '결과 보기' : '다음' }).click()
    }
    await expect(page.getByText('이번 결과')).toBeVisible()
    await shot(page, p('04-result'))
    await page.getByRole('button', { name: '계속하기' }).click()
    await shot(page, p('05-tips'))
    await page.getByRole('link', { name: '나의 이전 결과 보기' }).click()
    await expect(page.getByRole('heading', { name: '점수 변화' })).toBeVisible()
    await shot(page, p('06-history'))
    await page.goto('/me/wellbeing')
    await expect(page.getByRole('link', { name: /마음 건강 살펴보기 · 질문 5개/ })).toBeVisible()
    await page.getByRole('heading', { name: '마음 점검' }).scrollIntoViewIfNeeded()
    await shot(page, p('07-wellbeing'))
  })
}

/** 성향조사 · 추천 카드 이유 — 기본 390px / 글자 4단계 320px */
for (const { prefix, scale, width } of [
  { prefix: 's1', scale: '1', width: 390 },
  { prefix: 's4', scale: '4', width: 320 },
]) {
  test(`화면 캡처 성향조사 (${prefix})`, async ({ page }) => {
    test.setTimeout(90_000)
    await page.setViewportSize({ width, height: 844 })
    await page.addInitScript((s) => {
      const k = 'wipi.a11y'
      const cur = JSON.parse(localStorage.getItem(k) ?? '{}')
      localStorage.setItem(k, JSON.stringify({ ...cur, fontScale: Number(s) }))
    }, scale)
    const p = (n: string) => `${prefix}-${n}`

    await startTour(page, { survey: true })
    await page.goto('/friends/survey')
    await expect(page.getByRole('button', { name: '시작하기' })).toBeVisible()
    await shot(page, p('01-intro'))
    await page.getByRole('button', { name: '시작하기' }).click()
    await shot(page, p('02-q1'))
    // 보기가 긴 1번 — 실제 화면(뷰포트)에서 이전·다음이 아래 메뉴 위에 보이는지
    await page.screenshot({ path: `${dir}/${p('02-q1-viewport')}.png` })
    const pick: [string, string][] = [
      ['radio', '산책하거나 운동하기'],
      ['button', '공원'],
      ['button', '평일 오전'],
      ['radio', '일주일에 한 번'],
      ['radio', '상대방의 이야기를 주로 들어주는 편이에요.'],
      ['radio', '조용하고 차분한 친구'],
      ['button', '차분함'],
    ]
    await page.getByRole('button', { name: '다음' }).click()
    for (const [i, [role, name]] of pick.entries()) {
      await page.getByRole(role as 'radio' | 'button', { name, exact: true }).click()
      if (i === 5) {
        await shot(page, p('03-q7'))
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
        await page.screenshot({ path: `${dir}/${p('03-q7-viewport-bottom')}.png` })
      }
      if (i === 6) await shot(page, p('04-q8'))
      await page.getByRole('button', { name: i === pick.length - 1 ? '다 했어요' : '다음' }).click()
    }
    await expect(page.getByRole('heading', { name: '성향조사를 마쳤어요!' })).toBeVisible()
    await shot(page, p('05-done'))
    await page.getByRole('link', { name: '추천 친구 만나보기' }).click()
    await expect(page.getByRole('region', { name: '추천 친구 목록' }).getByRole('article').first()).toBeVisible()
    await shot(page, p('06-cards'))
  })
}
