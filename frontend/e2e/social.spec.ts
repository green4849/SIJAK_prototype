import { expect, test } from '@playwright/test'
import { confirmRequest, mainNav, startTour } from './helpers'

test('④ 받은 친구 신청 수락 → 그 자리에서 인사하러 가기 → 친구 수 증가', async ({ page }) => {
  await startTour(page)
  await mainNav(page).getByRole('link', { name: '친구' }).click()
  const received = page.getByRole('region', { name: /나에게 온 친구 신청/ })
  await expect(received.getByRole('article', { name: '박정호님' })).toBeVisible()
  await received.getByRole('button', { name: '수락하기' }).click()
  // 수락한 카드는 사라지지 않고 '인사하러 가기'로 — 대화로 가는 길을 찾지 않아도 된다
  await expect(received).toContainText('박정호님과 친구가 됐어요')
  await expect(received.getByRole('button', { name: '수락하기' })).toHaveCount(0)
  await received.getByRole('link', { name: '인사하러 가기' }).click()
  await expect(page).toHaveURL(/\/chats\/(?!with)/)
  await expect(page.getByLabel('보낼 메시지')).toBeVisible()
  // 대화방의 '뒤로'는 들어온 곳(친구 화면)으로
  await page.getByRole('button', { name: '뒤로' }).click()
  await expect(page.getByRole('heading', { name: '동네 친구 찾기' })).toBeVisible()

  await page.goto('/me')
  await expect(page.getByRole('link', { name: /내 친구 목록/ })).toContainText('3명')
})

test('④ 추천 친구에게 신청 → 버튼이 "신청했어요"로', async ({ page }) => {
  await startTour(page)
  await page.goto('/friends')
  const card = page.getByRole('article', { name: '김영희님' })
  await card.getByRole('button', { name: '친구 신청' }).click()
  await confirmRequest(page)
  await expect(card.getByRole('button', { name: /신청했어요/ })).toBeDisabled()
})

test('④ 이웃이 신청을 받아 주면 카드가 "대화하기"로 → 대화방으로 이어진다', async ({ page }) => {
  await startTour(page)
  await page.goto('/friends')
  // 박정호님은 위 '나에게 온 친구 신청'에만 (추천 목록에 두 번 나오지 않음)
  await expect(page.getByRole('article', { name: '박정호님' })).toHaveCount(1)

  const card = page.getByRole('region', { name: '추천 친구 목록' }).getByRole('article', { name: '김영희님' })
  await card.getByRole('button', { name: /친구 신청/ }).click()
  await confirmRequest(page)
  await expect(card.getByRole('button', { name: /신청했어요/ })).toBeDisabled()
  await expect(card.getByRole('link', { name: '대화하기' })).toBeVisible({ timeout: 10_000 })
  await expect(page.getByRole('status').filter({ hasText: '김영희님이 친구 신청을 받아 주셨어요' })).toBeVisible()

  await card.getByRole('link', { name: '대화하기' }).click()
  await expect(page).toHaveURL(/\/chats\/(?!with)/)
  await expect(page.getByText('김영희님께 먼저 인사를 건네 보세요.')).toBeVisible()
})

test('④ 신청 직후 새로고침해도 수락은 이어지고, 알림함에 소식이 온다', async ({ page }) => {
  await startTour(page)
  await page.goto('/friends')
  const card = page.getByRole('article', { name: '김영희님' })
  await card.getByRole('button', { name: /친구 신청/ }).click()
  await confirmRequest(page)
  await expect(card.getByRole('button', { name: /신청했어요/ })).toBeDisabled()
  await page.reload()
  await page.waitForTimeout(3500)
  await page.goto('/me/friends')
  await expect(page.getByRole('article', { name: '김영희님' })).toBeVisible()
  await page.goto('/notifications')
  await expect(page.getByText('김영희님이 친구 신청을 받아 주셨어요')).toBeVisible()
})

test('⑤ 대화: 보내면 이웃 답장이 폴링으로 도착', async ({ page }) => {
  await startTour(page)
  await page.goto('/chats')
  await page.getByRole('link', { name: /이순자님/ }).click()
  await expect(page.getByText('함께해요!')).toBeVisible()
  const before = await page.locator('main ol > li').count()

  await page.getByLabel('보낼 메시지').fill('내일 10시에 공원에서 만나요!')
  await page.getByRole('button', { name: '보내기' }).click()
  await expect(page.getByText('내일 10시에 공원에서 만나요!')).toBeVisible()
  // 데모 자동 답장 2.5초 + 폴링 3초
  await expect.poll(() => page.locator('main ol > li').count(), { timeout: 10_000 }).toBeGreaterThan(before + 1)
})

test('안전: 위험 대화 경고 → 신고 → 차단되면 입력줄이 안내로', async ({ page }) => {
  await startTour(page)
  await page.goto('/chats')
  await expect(page.getByRole('link', { name: /정덕수님/ })).toContainText('안 읽은 메시지')
  await page.getByRole('link', { name: /정덕수님/ }).click()

  const warning = page.getByRole('note', { name: '위험 경고' })
  await expect(warning).toContainText('잠깐만요! 조심하세요')
  await warning.getByRole('button', { name: '신고하기' }).click()
  const dialog = page.getByRole('dialog', { name: '정덕수님 신고하기' })
  await dialog.getByRole('radio', { name: '돈을 요구해요' }).click()
  await dialog.getByRole('button', { name: '신고하고 차단하기' }).click()
  await expect(page.getByText('차단된 대화예요')).toBeVisible()

  // 마이페이지에서 차단 풀기
  await page.goto('/me/blocks')
  await page.getByRole('button', { name: '차단 풀기' }).click()
  await expect(page.getByText('차단한 이웃이 없어요')).toBeVisible()
})

test('받은 신청 거절과 로그아웃은 한 번 묻는다 — 그만두면 그대로', async ({ page }) => {
  await startTour(page)
  await page.goto('/friends')
  const received = page.getByRole('region', { name: /나에게 온 친구 신청/ })
  await received.getByRole('button', { name: '거절하기' }).click()
  const ask = page.getByRole('dialog', { name: '박정호님의 신청을 거절할까요?' })
  await expect(ask).toContainText('아직 모르겠으면 그냥 두셔도 돼요')
  await ask.getByRole('button', { name: '닫기' }).click()
  await expect(received.getByRole('article', { name: '박정호님' })).toBeVisible()

  await received.getByRole('button', { name: '거절하기' }).click()
  await page.getByRole('dialog', { name: /거절할까요/ }).getByRole('button', { name: '거절하기' }).click()
  await expect(received).toHaveCount(0)

  await page.goto('/me')
  await page.getByRole('button', { name: '로그아웃' }).click()
  const logout = page.getByRole('dialog', { name: '로그아웃할까요?' })
  await expect(logout).toContainText('휴대폰 인증')
  await logout.getByRole('button', { name: '닫기' }).click()
  // 그만두면 그대로 마이페이지
  await expect(logout).toHaveCount(0)
  await expect(page).toHaveURL(/\/me$/)
  await expect(page.getByRole('button', { name: '로그아웃' })).toBeVisible()
})

test('성향조사: 추천 친구 탭 처음 → 시작 화면 → 8문항 → 잘 맞는 이웃과 이유', async ({ page }) => {
  await startTour(page, { survey: true })
  await page.getByRole('link', { name: '친구 찾기' }).click()
  // 아직 안 했으니 시작 화면으로
  await expect(page).toHaveURL(/\/friends\/survey$/)
  await expect(page.getByRole('heading', { name: '나와 잘 맞는 동네 친구 찾기' })).toBeVisible()
  await page.getByRole('button', { name: '시작하기' }).click()

  // 1. 좋아하는 활동 — 가입 때 고른 것이 미리 골라져 있다
  await expect(page.getByText('1 / 8')).toBeVisible()
  await expect(page.getByRole('button', { name: '산책·등산' })).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: '다음' }).click()
  // 2. 하고 싶은 일 — 고르기 전에는 넘어갈 수 없다
  await expect(page.getByRole('button', { name: '골라 주세요' })).toBeDisabled()
  await page.getByRole('radio', { name: '산책하거나 운동하기' }).click()
  await page.getByRole('button', { name: '다음' }).click()
  // 3. 장소 — 2개까지
  await page.getByRole('button', { name: '공원' }).click()
  await page.getByRole('button', { name: '카페' }).click()
  await page.getByRole('button', { name: '동네 식당' }).click()
  await expect(page.getByRole('alert')).toContainText('2개까지 고를 수 있어요')
  await page.getByRole('button', { name: '카페' }).click() // 빼기
  await page.getByRole('button', { name: '다음' }).click()
  // 4. 시간 — '시간 상관없음'은 다른 시간과 함께 고르지 않는다
  await page.getByRole('button', { name: '시간 상관없음' }).click()
  await page.getByRole('button', { name: '평일 오전' }).click()
  await expect(page.getByRole('button', { name: '시간 상관없음' })).toHaveAttribute('aria-pressed', 'false')
  await page.getByRole('button', { name: '다음' }).click()
  // 이전으로 가도 고른 답이 남아 있다
  await page.getByRole('button', { name: '이전' }).click()
  await expect(page.getByRole('button', { name: '평일 오전' })).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: '다음' }).click()
  // 5~8
  await page.getByRole('radio', { name: '일주일에 한 번' }).click()
  await page.getByRole('button', { name: '다음' }).click()
  await page.getByRole('radio', { name: /상대방의 이야기를 주로 들어주는 편/ }).click()
  await page.getByRole('button', { name: '다음' }).click()
  await page.getByRole('radio', { name: '조용하고 차분한 친구' }).click()
  await page.getByRole('button', { name: '다음' }).click()
  await expect(page.getByText('8 / 8')).toBeVisible()
  await page.getByRole('button', { name: '차분함' }).click()
  await page.getByRole('button', { name: '계획적' }).click()
  await page.getByRole('button', { name: '다 했어요' }).click()

  await expect(page.getByRole('heading', { name: '성향조사를 마쳤어요!' })).toBeVisible()
  await page.getByRole('link', { name: '추천 친구 만나보기' }).click()
  await expect(page).toHaveURL(/\/friends$/)
  // 윤기철님: 산책·평일 오전·공원·주 1회·차분 — 맨 위, 점수 대신 말과 이유
  const first = page.getByRole('region', { name: '추천 친구 목록' }).getByRole('article').first()
  await expect(first).toHaveAccessibleName('윤기철님')
  await expect(first).toContainText('잘 맞아요')
  await expect(first.getByRole('list', { name: '추천 이유' })).toContainText('둘 다 평일 오전이 편해요')
  await expect(first).not.toContainText('점')
  // 했으니 탭 위에는 고치러 가는 카드
  await expect(page.getByRole('link', { name: '내 취향 수정하기' })).toBeVisible()
  await page.getByRole('link', { name: '내 취향 수정하기' }).click()
  await expect(page.getByText('1 / 8')).toBeVisible()
  await expect(page.getByRole('heading', { name: '나와 잘 맞는 동네 친구 찾기' })).toHaveCount(0)
})

test('성향조사: 다음에 하기 → 목록으로, 다시 와도 시작 화면 없이 탭 위 카드로 권한다', async ({ page }) => {
  await startTour(page, { survey: true })
  await page.goto('/friends')
  await page.getByRole('link', { name: '다음에 하기' }).click()
  await expect(page).toHaveURL(/\/friends$/)
  await expect(page.getByRole('link', { name: /나와 잘 맞는 친구 찾기/ })).toBeVisible()
  await page.goto('/')
  await page.goto('/friends')
  await expect(page).toHaveURL(/\/friends$/)
  await expect(page.getByRole('article').first()).toBeVisible()
})
