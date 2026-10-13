/** C7 가까운 복지시설 · 두뇌 운동 — 화면·데모 (백엔드 없음) */
import { expect, test } from '@playwright/test'
import { startTour } from './helpers'

test('지역생활 → 가까운 복지관·경로당 → 종류별 → 상세(프로그램·모임 공간·전화 신청)', async ({ page }) => {
  await startTour(page)
  await page.goto('/activities')
  await page.getByRole('link', { name: '가까운 복지관·경로당' }).click()
  await expect(page.getByRole('heading', { name: '가까운 복지시설' })).toBeVisible()
  await expect(page.getByRole('link', { name: /오산노인종합복지관/ })).toBeVisible()

  await page.getByRole('tab', { name: '경로당' }).click()
  await expect(page.getByRole('link', { name: /오산노인종합복지관/ })).toHaveCount(0)
  await expect(page.getByRole('link', { name: /세마e편한세상 경로당/ })).toBeVisible()

  await page.getByRole('tab', { name: '전체' }).click()
  await page.getByRole('link', { name: /오산노인종합복지관/ }).click()
  await expect(page.getByRole('heading', { name: '오산노인종합복지관' })).toBeVisible()
  await expect(page.getByRole('heading', { name: '프로그램' })).toBeVisible()
  await expect(page.getByText('건강 체조')).toBeVisible()
  await expect(page.getByRole('heading', { name: '모임 공간 빌리기' })).toBeVisible()
  await expect(page.getByRole('link', { name: '전화로 신청하기' })).toHaveAttribute('href', 'tel:0312345678')
})

test('홈 → 오늘의 두뇌 운동 → 셈하기 다섯 문제 → 기록이 오늘로', async ({ page }) => {
  await startTour(page)
  await page.getByRole('link', { name: /오늘의 두뇌 운동/ }).click()
  await expect(page.getByRole('heading', { name: /3일 이어 했어요/ })).toBeVisible()
  await page.getByRole('link', { name: /셈하기/ }).click()

  for (let i = 1; i <= 5; i++) {
    await expect(page.getByText(`${i} / 5`)).toBeVisible()
    const q = (await page.getByText(/= \?$/).textContent())!
    const [a, op, b] = q.replace('= ?', '').trim().split(' ')
    const answer = op === '+' ? Number(a) + Number(b) : Number(a) - Number(b)
    await page.getByRole('group', { name: '답 고르기' }).getByRole('button', { name: String(answer), exact: true }).click()
    await expect(page.getByText('맞았어요!')).toBeVisible()
    await page.getByRole('button', { name: i < 5 ? '다음 문제' : '결과 보기' }).click()
  }
  await expect(page.getByRole('heading', { name: '모두 맞혔어요!' })).toBeVisible()
  await page.getByRole('link', { name: '끝내기' }).click()
  await expect(page.getByRole('heading', { name: /4일째 이어 하고 있어요/ })).toBeVisible()
})

test('짝 맞추기 — 두 장 뒤집으면 그림과 이름이 보이고 횟수가 센다', async ({ page }) => {
  await startTour(page)
  await page.goto('/brain/match')
  await page.getByRole('button', { name: '1번 카드' }).click()
  await page.getByRole('button', { name: '2번 카드' }).click()
  await expect(page.getByText(/찾은 짝 \d \/ 4 · 1번/)).toBeVisible()
  await expect(page.getByRole('button', { name: /사과|꽃|해|물고기/ }).first()).toBeVisible()
})
