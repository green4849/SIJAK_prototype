import { expect, type Page } from '@playwright/test'

/** 둘러보기 링크(?tour) → 시드 계정(김시작)으로 홈까지 */
export async function startTour(page: Page, { survey = false }: { survey?: boolean } = {}) {
  await page.goto('/?tour')
  await expect(page.getByRole('heading', { name: '김시작님' })).toBeVisible()
  // 둘러보기 계정은 성향조사를 안 해서 추천 친구 위에 권하는 카드가 뜬다 —
  // 그 흐름을 보는 테스트(survey: true)가 아니면 카드를 닫은('다음에 하기') 것으로 둔다
  if (!survey) await page.evaluate(() => localStorage.setItem('wipi.surveyLater', '1'))
}

export const mainNav = (page: Page) => page.getByRole('navigation', { name: '주요 메뉴' })

/** 휴대폰 인증 화면 입력 → 화면에 표시된 인증번호로 확인 */
export async function verifyPhone(
  page: Page,
  p: { name: string; year: string; month: string; day: string; phone: string; gender: '남성' | '여성' },
) {
  await page.getByLabel('이름').fill(p.name)
  await page.getByLabel('년', { exact: true }).fill(p.year)
  await page.getByLabel('월', { exact: true }).fill(p.month)
  await page.getByLabel('일', { exact: true }).fill(p.day)
  await page.getByLabel('휴대폰 번호').fill(p.phone)
  await page.getByRole('radio', { name: p.gender }).click()
  await page.getByRole('button', { name: '인증번호 받기' }).click()
  const banner = await page.getByRole('status').filter({ hasText: '시연용' }).textContent()
  await page.getByLabel('인증번호').fill(banner!.match(/\d{6}/)![0])
  await page.getByRole('button', { name: '확인', exact: true }).click()
}

/** 가입 1/3 약관 동의 — 기본은 '모두 동의해요', health: false 면 필수만 하나씩 (B6) */
export async function agreeTerms(page: Page, { health = true }: { health?: boolean } = {}) {
  await expect(page.getByRole('heading', { name: /약관을 확인해 주세요/ })).toBeVisible()
  if (health) await page.getByRole('checkbox', { name: '모두 동의해요' }).check()
  else
    for (const label of ['서비스 이용약관에 동의해요', '개인정보 수집·이용에 동의해요', '위치 정보 이용에 동의해요'])
      await page.getByRole('checkbox', { name: new RegExp(label) }).check()
  await page.getByRole('button', { name: '동의하고 다음' }).click()
}

/** 포인트가 드는 친구 신청의 확인 창 — 무료 신청이면 창이 없어 그냥 지나간다 */
export async function confirmRequest(page: Page) {
  const ask = page.getByRole('dialog', { name: /친구 신청할까요/ })
  const shown = await ask.waitFor({ timeout: 1500 }).then(() => true, () => false)
  if (shown) await ask.getByRole('button', { name: /친구 신청/ }).click()
}
