import { expect, type Page } from '@playwright/test'

/** 둘러보기 링크(?tour) → 시드 계정(김시작)으로 홈까지 */
export async function startTour(page: Page) {
  await page.goto('/?tour')
  await expect(page.getByRole('heading', { name: '김시작님' })).toBeVisible()
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
  await page.getByLabel('휴대전화 번호').fill(p.phone)
  await page.getByRole('radio', { name: p.gender }).click()
  await page.getByRole('button', { name: '인증번호 받기' }).click()
  const banner = await page.getByRole('status').filter({ hasText: '시연용' }).textContent()
  await page.getByLabel('인증번호').fill(banner!.match(/\d{6}/)![0])
  await page.getByRole('button', { name: '확인', exact: true }).click()
}
