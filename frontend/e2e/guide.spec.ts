/**
 * 시작이 앱 가이드 (C14) — 화면 흐름.
 * 답 고르기 자체는 guide-engine.spec.ts 가 브라우저 없이 본다. 여기서는
 *  · 지금 화면을 기준으로 답하는지 · 버튼을 짚어 주되 대신 누르지 않는지
 *  · 입력칸·중요한 버튼을 가리지 않는지 · 위급이 먼저인지 · 큰 글씨·좁은 화면에서도 쓸 수 있는지
 */
import { expect, test, type Page } from '@playwright/test'
import { mainNav, startTour } from './helpers'

const launcher = (page: Page) => page.getByRole('button', { name: '시작이에게 앱 사용법 물어보기' })
const panel = (page: Page) => page.getByRole('dialog', { name: '시작이에게 물어보기' })
const log = (page: Page) => panel(page).getByRole('log')
const callout = (page: Page) => page.getByRole('group', { name: '시작이 안내' })

async function ask(page: Page, question: string) {
  await panel(page).getByLabel('시작이에게 물어볼 말').fill(question)
  await panel(page).getByRole('button', { name: '물어보기', exact: true }).click()
}

const box = async (page: Page, selector: string) => (await page.locator(selector).first().boundingBox())!
const overlaps = (a: { x: number; y: number; width: number; height: number }, b: typeof a) =>
  a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height

test('지금 보고 있는 화면을 기준으로 답한다', async ({ page }) => {
  await startTour(page)
  await launcher(page).click()
  await expect(log(page)).toContainText('지금은 ‘홈’ 화면이에요')
  // 미리 준비한 답이라는 점을 늘 밝힌다
  await expect(panel(page)).toContainText('미리 준비한 답이에요')
  await panel(page).getByRole('button', { name: '이 화면에서 뭘 해야 해요?' }).click()
  await expect(log(page)).toContainText('큰 카드 네 개')

  // 화면을 덮지 않는다 — 뒤 화면을 그대로 누를 수 있고, 옮기면 창은 접힌다
  await mainNav(page).getByRole('link', { name: /친구/ }).click()
  await expect(page.getByRole('heading', { name: '동네 친구 찾기' })).toBeVisible()
  await expect(panel(page)).toBeHidden()

  // 같은 질문, 다른 화면 → 다른 답 (받은 친구 신청이 있는 화면)
  await launcher(page).click()
  await expect(log(page)).toContainText('지금은 ‘동네 친구 찾기’ 화면이에요')
  await ask(page, '여기서 뭐 해야 해?')
  await expect(log(page)).toContainText('나에게 온 친구 신청')
})

test('같이 가 보기 — 버튼을 짚어 주고, 누르는 것은 사용자가 한다', async ({ page }) => {
  await startTour(page)
  await launcher(page).click()
  await ask(page, '친구 신청은 어떻게 해?')
  await expect(log(page)).toContainText('아래 ‘친구’ 메뉴를 눌러요.')
  await panel(page).getByRole('button', { name: '같이 가 보기' }).click()

  // 첫 걸음: 창이 접히고 ‘친구’ 메뉴를 짚는다. 화면은 아직 그대로
  await expect(panel(page)).toBeHidden()
  await expect(callout(page)).toContainText('먼저 아래 ‘친구’ 메뉴를 누르세요.')
  await expect(page).toHaveURL(/\/\?tour$|\/$/)

  // 사용자가 직접 누르면 다음 화면에서 다음 걸음을 짚는다
  await mainNav(page).getByRole('link', { name: /친구/ }).click()
  await expect(callout(page)).toContainText('여기 ‘친구 신청’이에요')

  // 짚은 것은 누름을 막지 않고, 말풍선이 그 버튼을 가리지 않는다
  const target = page.getByRole('button', { name: /^친구 신청/ }).first()
  const [t, c] = [(await target.boundingBox())!, (await callout(page).boundingBox())!]
  expect(overlaps(t, c)).toBe(false)

  // 시작이는 신청하지 않았다 — 버튼이 그대로 ‘친구 신청’이고 포인트도 그대로
  await expect(target).toBeEnabled()
  await expect(page.getByRole('button', { name: /신청했어요/ })).toHaveCount(0)

  // 사용자가 직접 누르면 그때 신청된다
  await target.click()
  await expect(page.getByRole('button', { name: /신청했어요/ })).toHaveCount(1)
  await expect(callout(page)).toBeHidden()
})

test('지금 화면에 없는 버튼은 가리키지 않고 그대로 말한다', async ({ page }) => {
  await startTour(page)
  await page.goto('/chats')
  await page.getByRole('link', { name: /이순자님/ }).click()
  await launcher(page).click()
  // 대화 화면에는 ‘친구 신청’ 버튼이 없다 → 친구 화면으로 옮겨서 짚는다
  await ask(page, '음성으로 보내고 싶어')
  await expect(log(page)).toContainText('입력칸 옆 ‘말하기’')
  await panel(page).getByRole('button', { name: '‘말하기’ 어디 있어요?' }).click()
  await expect(callout(page)).toContainText('여기 ‘말하기’예요')
  await callout(page).getByRole('button', { name: '알겠어요' }).click()
  await expect(callout(page)).toBeHidden()

  // 입력칸에 글을 쓰면 ‘말하기’가 ‘보내기’로 바뀐다 → 다시 물으면 없는 것을 가리키지 않는다
  await page.getByLabel('보낼 메시지').fill('안녕하세요')
  await page.getByLabel('보낼 메시지').blur()
  await launcher(page).click()
  await panel(page).getByRole('button', { name: '‘말하기’ 어디 있어요?' }).click()
  await expect(log(page)).toContainText('지금 화면에서는 보이지 않아요')
  // 메시지는 보내지 않았다
  await expect(page.getByLabel('보낼 메시지')).toHaveValue('안녕하세요')
})

test('모르는 질문은 지어내지 않고, 확인할 수 있는 것을 알려 준다', async ({ page }) => {
  await startTour(page)
  await launcher(page).click()
  await ask(page, '오늘 날씨가 어떨까?')
  await expect(log(page)).toContainText('제가 준비한 안내에 없어요')
  await expect(log(page).getByRole('button', { name: '이 화면에서 뭘 해야 해요?' })).toBeVisible()
  await log(page).getByRole('button', { name: '도움말 보기' }).click()
  await expect(page).toHaveURL(/\/me\/help$/)
})

test('위급한 말에는 앱 안내보다 전화가 먼저', async ({ page }) => {
  await startTour(page)
  await launcher(page).click()
  // 창 아래에는 질문과 상관없이 늘 119
  await expect(panel(page).getByRole('link', { name: /급할 땐 119/ })).toHaveAttribute('href', 'tel:119')

  await ask(page, '친구 신청하다가 가슴이 너무 아파')
  const calls = log(page).getByRole('link', { name: /전화하기/ })
  await expect(calls.first()).toHaveAttribute('href', 'tel:119')
  await expect(log(page)).toContainText('앱보다 전화가 먼저예요')
  // 시연의 ‘도움 요청’이 실제로 알림을 보내는 것처럼 보이지 않게
  await expect(log(page)).toContainText('실제로 알림이 가지 않아요')
  await expect(log(page).getByRole('button', { name: '같이 가 보기' })).toHaveCount(0)

  await ask(page, '사는 게 힘들어 죽고 싶어')
  await expect(log(page).getByRole('link', { name: /109 상담 전화하기/ })).toHaveAttribute('href', 'tel:109')

  await ask(page, '누가 돈을 보내 달래')
  await expect(log(page)).toContainText('누구에게도 알려 주지 마세요')
})

test('말동무와 역할이 다르다 — 이야기는 말동무로, 사용법은 시작이가', async ({ page }) => {
  await startTour(page)
  await launcher(page).click()
  await ask(page, '심심하고 외로워')
  await expect(log(page)).toContainText('일상 이야기는 말동무가 들어 드려요')
  await expect(log(page)).toContainText('시연 화면의 말동무는 실제 AI가 아니에요')
  await ask(page, '너는 사람이야?')
  await expect(log(page)).toContainText('사람이 아니고')

  // 말동무 화면에서도 사용법은 물을 수 있다 — 입력줄을 가리지 않는다
  await page.goto('/companion')
  await expect(page.getByLabel('말동무에게 할 말')).toBeVisible()
  await expect(launcher(page)).toBeVisible()
  expect(overlaps(await box(page, '[data-guide-ui] button'), await box(page, '[data-bottom-bar]'))).toBe(false)
})

test('글씨 키우기 — 안내 창에서 바로 고르고, 설정 화면과 같은 값을 쓴다', async ({ page }) => {
  await page.goto('/welcome')
  await launcher(page).click()
  await ask(page, '글씨를 키우고 싶어')
  await log(page).getByRole('radio', { name: '크게', exact: true }).click()
  await expect(page.locator('html')).toHaveAttribute('data-font-scale', '2')
  // 시작 화면의 '가가' 버튼도 같은 값을 본다
  await panel(page).getByRole('button', { name: '닫기' }).click()
  await expect(page.getByRole('button', { name: '글씨 크게' })).toHaveAttribute('aria-pressed', 'true')
})

test('가입 전에도 지금 단계에 맞춰 돕는다', async ({ page }) => {
  await page.goto('/login/phone')
  await launcher(page).click()
  await expect(log(page)).toContainText('지금은 ‘휴대폰 인증’ 화면이에요')
  await ask(page, '뭘 해야 해?')
  await expect(log(page)).toContainText('‘인증번호 받기’를 누르세요')
  // 시연이라 실제 문자가 가지 않는다는 점을 숨기지 않는다
  await expect(log(page)).toContainText('시연 화면이라 실제 문자는 가지 않아요')
  // 들어가야 쓸 수 있는 기능의 길은 안내하지 않는다
  await ask(page, '친구 신청은 어떻게 해?')
  await expect(log(page)).toContainText('본인 확인을 마치고 들어가면')
  await expect(log(page).getByRole('button', { name: '같이 가 보기' })).toHaveCount(0)

  await panel(page).getByRole('button', { name: '‘인증번호 받기’ 어디 있어요?' }).click()
  await expect(callout(page)).toContainText('‘인증번호 받기’를 누르세요')
})

test('쉽게 열고 닫는다 — 닫기·Esc, 초점이 돌아온다', async ({ page }) => {
  await startTour(page)
  await launcher(page).click()
  await expect(panel(page).getByRole('heading', { name: '시작이에게 물어보기' })).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(panel(page)).toBeHidden()
  await expect(launcher(page)).toBeFocused()
  await launcher(page).click()
  await panel(page).getByRole('button', { name: '닫기' }).click()
  await expect(panel(page)).toBeHidden()
})

test('버튼을 숨겨도 도움말에서 부를 수 있다', async ({ page }) => {
  await startTour(page)
  await page.goto('/me/settings')
  await page.getByRole('radiogroup').last().getByRole('radio', { name: '숨기기' }).click()
  await expect(launcher(page)).toHaveCount(0)
  await page.goto('/me/help')
  await expect(launcher(page)).toHaveCount(0)
  await page.getByRole('button', { name: '시작이에게 물어보기' }).click()
  await expect(log(page)).toContainText('지금은 ‘도움말’ 화면이에요')
})

test('입력칸·중요한 버튼을 가리지 않는다', async ({ page }) => {
  await startTour(page)
  // 아래 고정 막대가 있는 화면: 하단 탭 / 대화 입력줄 / 활동 ‘신청하기’ / 말동무 입력줄
  await page.goto('/chats')
  const room = (await page.getByRole('link', { name: /이순자님/ }).getAttribute('href'))!.replace(/^.*?(\/chats\/)/, '$1')
  await page.goto('/activities')
  const activity = (await page.getByRole('link', { name: /건강 걷기 모임/ }).getAttribute('href'))!.replace(/^.*?(\/activities\/)/, '$1')

  for (const path of ['/', '/friends', room, activity, '/companion', '/welfare/w-1']) {
    await page.goto(path)
    await page.waitForLoadState('networkidle')
    await expect(launcher(page), path).toBeVisible()
    const me = (await launcher(page).boundingBox())!
    for (const bar of await page.locator('[data-bottom-bar]').all()) {
      const b = await bar.boundingBox()
      if (b) expect(overlaps(me, b), `${path}: 아래 고정 막대와 겹침`).toBe(false)
    }
    // 끝까지 내리면 본문의 마지막 누르는 것이 시작이 밑에 깔리지 않는다
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
    const again = (await launcher(page).boundingBox())!
    const covered = await page.evaluate((m) => {
      const hit = (r: DOMRect) => r.left < m.x + m.width && m.x < r.right && r.top < m.y + m.height && m.y < r.bottom
      return [...document.querySelectorAll<HTMLElement>('main button, main a, main input')]
        .filter((el) => !el.closest('[data-bottom-bar]') && hit(el.getBoundingClientRect()))
        .map((el) => (el.innerText || el.getAttribute('aria-label') || el.tagName).trim().slice(0, 14))
    }, again)
    expect(covered, `${path}: 화면 끝에서 가려진 것`).toEqual([])
  }

  // 긴급 도움·운영자 화면에는 두지 않는다
  for (const path of ['/sos', '/admin']) {
    await page.goto(path)
    await page.waitForLoadState('networkidle')
    await expect(launcher(page), path).toHaveCount(0)
  }
})

test('아주 큰 글씨 + 선명한 화면 + 좁은 화면에서도 창을 쓸 수 있다', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 })
  await startTour(page)
  await page.goto('/me/settings')
  await page.getByRole('radio', { name: '아주 크게' }).click()
  await page.getByRole('radio', { name: '선명한 화면' }).click()
  await page.goto('/friends')
  await launcher(page).click()
  await ask(page, '친구 신청은 어떻게 해?')
  await expect(log(page)).toContainText('‘친구 신청’을 누르세요')

  const r = await page.evaluate(() => {
    const ui = document.querySelector<HTMLElement>('[role="dialog"][data-guide-ui]')!
    return {
      overflow: document.documentElement.scrollWidth > innerWidth || ui.scrollWidth > ui.clientWidth,
      small: [...ui.querySelectorAll<HTMLElement>('button, a, input')]
        .map((el) => ({ el, h: el.getBoundingClientRect().height }))
        .filter(({ h }) => h > 0 && h < 44)
        .map(({ el, h }) => `${(el.innerText || el.tagName).trim().slice(0, 12)} ${Math.round(h)}px`),
      // 닫기와 입력칸은 창이 길어져도 늘 화면 안에 있다
      closeTop: ui.querySelector('header button')!.getBoundingClientRect().top,
      inputBottom: ui.querySelector('input')!.getBoundingClientRect().bottom,
      height: innerHeight,
    }
  })
  expect(r.overflow).toBe(false)
  expect(r.small).toEqual([])
  expect(r.closeTop).toBeGreaterThanOrEqual(0)
  expect(r.inputBottom).toBeLessThanOrEqual(r.height)

  // 짚어 줄 때도 넘치지 않고, 말풍선이 그 버튼을 가리지 않는다
  await log(page).getByRole('button', { name: '‘친구 신청’ 어디 있어요?' }).click()
  await expect(callout(page)).toBeVisible()
  await page.waitForTimeout(300)
  const target = (await page.getByRole('button', { name: /^친구 신청/ }).first().boundingBox())!
  expect(overlaps(target, (await callout(page).boundingBox())!)).toBe(false)
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false)
})

test('안내에 적어 둔 버튼이 시연 화면에 실제로 있다', async ({ page }) => {
  await startTour(page)
  // 화면별 "이 화면에서 뭘 해야 해요?"의 첫 버튼을 눌렀을 때 '보이지 않아요'가 나오면 안내와 화면이 어긋난 것
  for (const path of ['/friends', '/chats', '/activities', '/me/profile', '/me/settings', '/me/guardians', '/companion']) {
    await page.goto(path)
    await page.waitForLoadState('networkidle')
    await launcher(page).click()
    await panel(page).getByRole('button', { name: '이 화면에서 뭘 해야 해요?' }).click()
    await log(page).getByRole('button', { name: /어디|어디서/ }).first().click()
    await expect(callout(page), path).toBeVisible()
    await callout(page).getByRole('button', { name: '알겠어요' }).click()
  }
})
