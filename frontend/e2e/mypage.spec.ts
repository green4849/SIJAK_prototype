/**
 * 마이페이지 메뉴 줄이기 (docs/ux-changes.md) — 메뉴 줄은 자주 쓰는 것만,
 * 가끔 쓰는 것(차단한 이웃·아이콘 놓기·도움말·약관 및 동의)은 맨 아래 작은 글자 링크로,
 * 알림 설정은 '설정' 화면 안으로, 위치 다시 확인은 사는 곳 옆으로.
 */
import { expect, test } from '@playwright/test'
import { startTour } from './helpers'

test('메뉴 줄은 자주 쓰는 것만, 나머지는 맨 아래 작은 글자 링크로', async ({ page }) => {
  await startTour(page)
  await page.goto('/me')

  const names = (list: string) =>
    page.getByRole('list', { name: list }).getByRole('listitem').evaluateAll((items) =>
      // 메뉴 줄의 이름 칸만 (오른쪽 값 '3명'·'100P' 등은 빼고)
      items.map((li) => li.querySelector('a, button')!.firstElementChild?.nextElementSibling?.textContent?.trim()),
    )
  await expect.poll(() => names('내 활동')).toEqual([
    '알림함', '내 프로필 관리', '성향조사 하기', '마음 건강', '내 포인트', '내 친구 목록', '신청한 활동', '관심 있는 활동',
  ])
  await expect.poll(() => names('도움')).toEqual(['설정', '보호자 연결', '안전하게 이용하기'])

  const more = page.getByRole('navigation', { name: '더 보기' })
  await expect(more.getByRole('link')).toHaveText(['차단한 이웃', '홈 화면에 아이콘 놓기', '도움말', '약관 및 동의'])
  // 작은 글자여도 누르는 자리는 44px 이상, 글자는 본문보다 조금 작은 정도(16px 이상)
  for (const link of await more.getByRole('link').all()) {
    const r = await link.evaluate((el) => ({ h: el.getBoundingClientRect().height, font: parseFloat(getComputedStyle(el).fontSize) }))
    expect(r.h).toBeGreaterThanOrEqual(44)
    expect(r.font).toBeGreaterThanOrEqual(16)
  }

  // 링크가 그 화면을 연다
  await more.getByRole('link', { name: '차단한 이웃' }).click()
  await expect(page.getByRole('heading', { name: '차단한 이웃' })).toBeVisible()
  await page.goBack()
  await more.getByRole('link', { name: '도움말' }).click()
  await expect(page.getByRole('heading', { name: '도움말' })).toBeVisible()
})

test('‘설정’ 한 화면에서 글자 크기·화면·진동·알림을 모두 바꾼다', async ({ page }) => {
  await startTour(page)
  await page.goto('/me')
  await page.getByRole('list', { name: '도움' }).getByRole('link', { name: '설정' }).click()
  await expect(page.getByRole('heading', { name: '설정', exact: true })).toBeVisible()
  for (const legend of ['글자 크기', '화면 대비', '진동', '시작이 버튼']) {
    await expect(page.getByRole('group', { name: legend })).toBeVisible()
  }
  await expect(page.getByRole('switch', { name: '추천 친구 알림' })).toBeVisible()
})
