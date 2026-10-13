/**
 * C12 — 포인트·추천 평가·대화 주제·봉사모임·첫 친구 미션·알림 설정
 * 둘러보기 시드: 김시작 110P (가입 100 + 어제 평가 10, 이순자님께 첫 신청은 무료로 이미 사용)
 */
import { expect, test, type Page } from '@playwright/test'
import { startTour } from './helpers'

const chip = (page: Page) => page.getByRole('link', { name: /^내 포인트/ })

test('C12 홈: 포인트 칩·첫 친구 미션 → 내 포인트 화면', async ({ page }) => {
  await startTour(page)
  await expect(chip(page)).toHaveText('110P')
  const mission = page.getByRole('region', { name: '미션: 첫 친구 3명 사귀기' })
  await expect(mission.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '1')
  await expect(mission).toContainText('3명 중 1명')

  await chip(page).click()
  await expect(page.getByRole('heading', { name: '내 포인트' })).toBeVisible()
  await expect(page.getByRole('region', { name: '지금 가진 포인트' })).toContainText('110P')
  const history = page.getByRole('region', { name: '최근 내역' })
  await expect(history).toContainText('이순자님께 친구 신청')
  await expect(history).toContainText('무료')
  await expect(history).toContainText('가입 축하')
})

test('C12 추천 평가: 만나보고 싶어요를 누르면 표시 + 포인트', async ({ page }) => {
  await startTour(page)
  await page.goto('/friends')
  await expect(page.getByText(/평가하면 \+10P · 오늘 5번/)).toBeVisible()

  const younghee = page.getByRole('article', { name: '김영희님' })
  await younghee.getByRole('button', { name: '만나보고 싶어요' }).click()
  await expect(younghee.getByRole('button', { name: /만나보고 싶어요/ })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('status').filter({ hasText: '+10P' })).toBeVisible()
  await expect(page.getByText(/오늘 4번/)).toBeVisible()

  await expect(younghee.getByRole('button', { name: /그저 그래요|잘 안 맞아요/ })).toHaveCount(0)

  await page.goto('/me')
  await expect(page.getByRole('link', { name: /내 포인트/ })).toContainText('120P')
})

test('C12 친구 신청 포인트: 가격 표시 → 모자라면 안내 창 (무료로 모으기 먼저)', async ({ page }) => {
  await startTour(page)
  await page.goto('/friends')
  for (const name of ['김영희님', '최말순님', '한옥자님']) {
    const card = page.getByRole('article', { name })
    await card.getByRole('button', { name: '친구 신청 · 30P' }).click()
    await expect(card.getByRole('button', { name: /신청했어요/ })).toBeDisabled()
  }
  // 110 − 90 = 20P → 네 번째는 모자람
  await page.getByRole('article', { name: '윤기철님' }).getByRole('button', { name: /친구 신청/ }).click()
  const sheet = page.getByRole('dialog', { name: '포인트가 조금 부족해요' })
  await expect(sheet).toBeVisible()
  await expect(sheet).toContainText('30P 필요')
  await expect(sheet).toContainText('20P')
  await sheet.getByRole('button', { name: /구독하고 매달 받기/ }).click()
  await expect(page.getByRole('status').filter({ hasText: '준비 중' })).toBeVisible()

  await sheet.getByRole('link', { name: /무료로 모으기/ }).click()
  await expect(page.getByRole('heading', { name: '내 포인트' })).toBeVisible()
  await expect(page.getByRole('region', { name: '포인트 모으기' })).toContainText('봉사모임 참여하기')
})

test('C12 봉사모임: 봉사 탭 → 참여 포인트 → 신청하면 적립, 취소하면 회수', async ({ page }) => {
  await startTour(page)
  await page.goto('/me/points')
  await page.getByRole('link', { name: /봉사모임 참여하기/ }).click()
  await expect(page.getByRole('tab', { name: '봉사' })).toHaveAttribute('aria-selected', 'true')
  const item = page.getByRole('link', { name: /어르신 도시락 나눔/ })
  await expect(item).toContainText('참여하면 +100P')
  await item.click()

  // 상세 화면이 뜬 뒤에 확인 (목록에도 같은 문구가 있어서)
  await expect(page.getByRole('heading', { level: 1, name: '어르신 도시락 나눔' })).toBeVisible()
  await expect(page.getByText(/참여하면 \+100P/)).toBeVisible()
  await page.getByRole('button', { name: '신청하기' }).click()
  await expect(page.getByRole('status').filter({ hasText: '+100P' })).toBeVisible()
  await page.goto('/me')
  await expect(page.getByRole('link', { name: /내 포인트/ })).toContainText('210P')

  await page.goBack()
  await page.getByRole('button', { name: '신청 취소하기' }).click()
  await expect(page.getByRole('status').filter({ hasText: '포인트를 돌려드렸어요' })).toBeVisible()
  await page.goto('/me')
  await expect(page.getByRole('link', { name: /내 포인트/ })).toContainText('110P')
})

test('C12 대화 주제: 고르면 입력칸에 들어가고, 보내기는 직접', async ({ page }) => {
  await startTour(page)
  await page.goto('/chats')
  await page.getByRole('link', { name: /이순자님/ }).click()
  // 이미 대화를 나눈 방이라 접혀 있다
  const toggle = page.getByRole('button', { name: '대화 주제 추천' })
  await expect(toggle).toHaveAttribute('aria-expanded', 'false')
  await toggle.click()

  const before = await page.locator('main ol > li').count()
  await page.getByRole('button', { name: '자주 가시는 산책길이 있으세요?' }).click()
  await expect(page.getByLabel('보낼 메시지')).toHaveValue('자주 가시는 산책길이 있으세요?')
  await expect(page.getByLabel('보낼 메시지')).toBeFocused()
  await expect(page.locator('main ol > li')).toHaveCount(before) // 자동으로 보내지 않음
  await expect(toggle).toHaveAttribute('aria-expanded', 'false')
})

test('C12 대화 주제: 위험 경고가 있는 방은 접혀 있고, 펼쳐도 경고가 보인다', async ({ page }) => {
  await startTour(page)
  await page.goto('/chats')
  await page.getByRole('link', { name: /정덕수님/ }).click()
  // 내가 한마디도 안 한 방이지만 경고가 있어서 접혀 있다
  const toggle = page.getByRole('button', { name: '대화 주제 추천' })
  await expect(toggle).toHaveAttribute('aria-expanded', 'false')
  const report = page.getByRole('button', { name: '신고하기' }).last()
  await expect(report).toBeInViewport()
  // 직접 펼쳐도 맨 아래를 따라 내려가 경고가 입력줄 뒤로 숨지 않는다
  await toggle.click()
  await expect(toggle).toHaveAttribute('aria-expanded', 'true')
  await expect(report).toBeInViewport()
})

test('C12 첫 친구 미션: 서로 대화한 친구 3명 → 500P 받기', async ({ page }) => {
  test.setTimeout(60_000)
  await startTour(page)
  // 박정호님 신청 수락 → 대화 (이웃 자동 답장)
  await page.goto('/friends')
  const received = page.getByRole('region', { name: /나에게 온 친구 신청/ })
  await received.getByRole('button', { name: '수락하기' }).click()
  await expect(received).toHaveCount(0) // 수락이 끝난 뒤에 이동
  // 정덕수님은 먼저 말을 걸어 왔음 → 내가 답하면 1명
  await page.goto('/chats/with/u-deoksu')
  await page.getByLabel('보낼 메시지').fill('네, 바둑 좋아요!')
  await page.getByRole('button', { name: '보내기' }).click()
  await expect(page.getByText('네, 바둑 좋아요!')).toBeVisible()

  // 박정호님 — 이웃 자동 답장(데모 타이머)이 올 때까지 이 방에서 기다린다 (페이지를 떠나면 타이머가 사라짐)
  await page.goto('/chats/with/u-jungho')
  await page.getByLabel('보낼 메시지').fill('안녕하세요, 반가워요!')
  await page.getByRole('button', { name: '보내기' }).click()
  await expect(page.getByText('안녕하세요, 반가워요!')).toBeVisible()
  const sent = await page.locator('main ol > li').count()
  // 자동 답장 2.5초 + 폴링 3초
  await expect.poll(() => page.locator('main ol > li').count(), { timeout: 15_000 }).toBeGreaterThan(sent)

  await page.goto('/')
  await page.getByRole('button', { name: '500P 받기' }).click()
  await expect(page.getByRole('status').filter({ hasText: '500P를 받았어요' })).toBeVisible()
  await expect(page.getByRole('region', { name: /미션/ })).toHaveCount(0) // 받은 미션은 홈에서 사라짐
  await expect(chip(page)).toHaveText('610P')
})

test('C12 알림 설정: 하루 2번까지, 바꾸면 바로 저장', async ({ page }) => {
  await startTour(page)
  await page.goto('/me')
  await page.getByRole('link', { name: '알림 설정' }).click()

  await expect(page.getByRole('switch', { name: '추천 친구 알림' })).toHaveAttribute('aria-checked', 'true')
  await expect(page.getByRole('button', { name: '아침 9시', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('button', { name: '저녁 7시', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('button', { name: '점심 1시' })).toBeDisabled()
  await expect(page.getByText('밤 9시부터 아침 8시까지는 알림을 보내지 않아요')).toBeVisible()

  await page.getByRole('button', { name: '저녁 7시', exact: true }).click()
  await expect(page.getByRole('button', { name: '점심 1시' })).toBeEnabled()
  await page.getByRole('button', { name: '점심 1시' }).click()
  // (토스트 '점심 1시에 알려 드릴게요'도 버튼이라 이름을 정확히)
  const noon = page.getByRole('button', { name: '점심 1시', exact: true })
  await expect(noon).toHaveAttribute('aria-pressed', 'true')

  await page.reload()
  await expect(noon).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('button', { name: '저녁 7시', exact: true })).toHaveAttribute('aria-pressed', 'false')

  await page.getByRole('switch', { name: '추천 친구 알림' }).click()
  await expect(page.getByRole('switch', { name: '추천 친구 알림' })).toHaveAttribute('aria-checked', 'false')
  await expect(noon).toHaveCount(0)
})
