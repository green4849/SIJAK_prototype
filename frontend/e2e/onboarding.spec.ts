import { expect, test, type Page } from '@playwright/test'
import { agreeTerms, verifyPhone } from './helpers'

// 이 파일의 가입 흐름은 위치 동의를 쓴다 — 위치·역지오코딩(OpenStreetMap)은 고정값으로
test.use({ permissions: ['geolocation'], geolocation: { latitude: 37.2665, longitude: 127.0473 } })
/** 가입 1/2(약관) 동의 → 2/2(사는 동네) */
async function toLocationStep(page: Page) {
  await agreeTerms(page)
}

async function completeSurvey(page: Page) {
  await page.getByRole('button', { name: '시작하기' }).click()
  await page.getByRole('button', { name: '산책·등산' }).click()
  await page.getByRole('button', { name: '다음' }).click()
  await page.getByRole('radio', { name: '산책하거나 운동하기' }).click()
  await page.getByRole('button', { name: '다음' }).click()
  await page.getByRole('button', { name: '공원' }).click()
  await page.getByRole('button', { name: '다음' }).click()
  await page.getByRole('button', { name: '평일 오전' }).click()
  await page.getByRole('button', { name: '다음' }).click()
  await page.getByRole('radio', { name: '일주일에 한 번' }).click()
  await page.getByRole('button', { name: '다음' }).click()
  await page.getByRole('radio', { name: /상대방의 이야기를 주로 들어주는 편/ }).click()
  await page.getByRole('button', { name: '다음' }).click()
  await page.getByRole('radio', { name: '조용하고 차분한 친구' }).click()
  await page.getByRole('button', { name: '다음' }).click()
  await page.getByRole('button', { name: '차분함' }).click()
  await page.getByRole('button', { name: '다 했어요' }).click()
  await page.getByRole('link', { name: '추천 친구 만나보기' }).click()
}

test.beforeEach(async ({ page }) => {
  await page.route('https://nominatim.openstreetmap.org/**', (r) =>
    r.fulfill({ json: { address: { state: '경기도', city: '수원시', borough: '영통구', quarter: '매탄동' } } }),
  )
})

test('시연용 로그인 → 동네 → 성향조사 → 추천 → 선택형 마음 점검', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveURL(/\/welcome$/)
  await page.getByRole('link', { name: '시작하기' }).click()
  await page.getByRole('link', { name: /시연용 로그인/ }).click()

  // 클라이언트 검증: 빈 채로 누르면 안내, 고치기 시작하면 사라짐
  await page.getByRole('button', { name: '인증번호 받기' }).click()
  await expect(page.getByRole('alert')).toHaveText('이름을 적어 주세요.')
  await page.getByLabel('이름').fill('홍')
  await expect(page.getByRole('alert')).toHaveCount(0)

  await verifyPhone(page, { name: '홍길순', year: '1957', month: '7', day: '7', phone: '01077778888', gender: '여성' })
  await expect(page).toHaveURL(/\/signup$/)
  // 필수 동의 후 활동 지역을 정한다.
  await expect(page.getByRole('heading', { name: /약관을 확인해 주세요/ })).toBeVisible()
  await page.getByRole('button', { name: '동의하고 다음' }).click()
  await expect(page.getByRole('alert')).toHaveText('[필수] 항목에 모두 동의해 주세요.')
  await page.getByRole('button', { name: '전체 내용 보기' }).first().click()
  await expect(page.getByRole('heading', { name: '제1조 목적' })).toBeVisible()
  await agreeTerms(page)
  await expect(page.getByRole('heading', { name: '활동할 동네를 알려 주세요' })).toBeVisible()
  // 뒤로 누르면 약관 단계로 돌아온다.
  await page.getByRole('button', { name: '뒤로' }).click()
  await expect(page.getByRole('checkbox', { name: '모두 동의해요' })).toBeChecked()
  await page.getByRole('button', { name: '동의하고 다음' }).click()
  // 위치 정보 수집 동의 → 그 자리에서 동네를 찾아 보여 준다
  await page.getByRole('checkbox', { name: /위치 정보 수집 동의/ }).check()
  await expect(page.getByText('경기도 수원시 영통구 매탄동')).toBeVisible()
  await page.getByRole('button', { name: '가입 완료' }).click()

  await expect(page.getByRole('heading', { name: '나와 잘 맞는 동네 친구 찾기' })).toBeVisible()
  await expect(page.getByRole('link', { name: '다음에 하기' })).toHaveCount(0)
  await completeSurvey(page)
  await page.getByRole('button', { name: '프로필 보기' }).first().click()
  await page.getByRole('dialog', { name: /님과 친구가 되어 볼까요/ }).getByRole('button', { name: '나중에 보기' }).click()
  // WHO-5는 첫 이용의 마지막 단계에서 선택할 수 있다.
  await expect(page.getByRole('heading', { name: '최근 2주 동안의 기분을 같이 살펴볼까요?' })).toBeVisible()
  await expect(page.getByRole('button', { name: '뒤로' })).toHaveCount(0)
  await expect(page.getByRole('link', { name: '나의 이전 결과 보기' })).toHaveCount(0)
  await page.getByRole('link', { name: '나중에 할게요' }).click()
  await expect(page.getByRole('heading', { name: '홍길순님' })).toBeVisible()
  // 미룬 분은 홈 카드로 다시 권한다
  await expect(page.getByRole('link', { name: /마음 건강 살펴볼 때예요.*질문 다섯 개/ })).toBeVisible()
})

test('역지오코딩이 안 되면 가까운 시·도로 어림한다', async ({ page }) => {
  await page.unroute('https://nominatim.openstreetmap.org/**')
  await page.route('https://nominatim.openstreetmap.org/**', (r) => r.abort())
  await page.goto('/login/phone')
  await verifyPhone(page, { name: '최어림', year: '1954', month: '4', day: '4', phone: '01044443333', gender: '남성' })
  await toLocationStep(page)
  await page.getByRole('checkbox', { name: /위치 정보 수집 동의/ }).check()
  await expect(page.getByText('경기도', { exact: true })).toBeVisible()
})

test.describe('위치 권한이 없으면', () => {
  test.use({ permissions: [] })

  test('동의가 되돌아가고 가입을 마칠 수 없다', async ({ page }) => {
    await page.goto('/login/phone')
    await verifyPhone(page, { name: '정거부', year: '1953', month: '5', day: '5', phone: '01033332222', gender: '여성' })
    await toLocationStep(page)
    await page.getByRole('checkbox', { name: /위치 정보 수집 동의/ }).click()
    await expect(page.getByRole('alert')).toContainText('위치')
    await expect(page.getByRole('checkbox', { name: /위치 정보 수집 동의/ })).not.toBeChecked()
    await page.getByRole('button', { name: '가입 완료' }).click()
    await expect(page.getByRole('alert').filter({ hasText: '위치 정보 수집에 동의해 주세요.' })).toBeVisible()
  })
})

test('첫 이용에서 프로필 확인 후 세 선택지 중 고른다', async ({ page }) => {
  await page.context().setGeolocation({ latitude: 37.193, longitude: 127.024 })
  await page.goto('/login/phone')
  await verifyPhone(page, { name: '이관심', year: '1955', month: '1', day: '1', phone: '01066665555', gender: '남성' })
  await toLocationStep(page)
  await page.getByRole('checkbox', { name: /위치 정보 수집 동의/ }).check()
  await page.getByRole('button', { name: '가입 완료' }).click()
  await completeSurvey(page)
  await page.getByRole('button', { name: '프로필 보기' }).first().click()
  const choice = page.getByRole('dialog', { name: /님과 친구가 되어 볼까요/ })
  await expect(choice).toContainText('프로필을 확인한 뒤 선택해 주세요.')
  await expect(choice.getByRole('button', { name: '친구 신청하기' })).toBeVisible()
  await expect(choice.getByRole('button', { name: '다른 친구 보기' })).toBeVisible()
  await expect(choice.getByRole('button', { name: '나중에 보기' })).toBeVisible()
  await choice.getByRole('button', { name: '다른 친구 보기' }).click()
  await expect(choice).toHaveCount(0)
  await page.getByRole('button', { name: '프로필 보기' }).first().click()
  await choice.getByRole('button', { name: '친구 신청하기' }).click()
  await expect(page.getByRole('heading', { name: '최근 2주 동안의 기분을 같이 살펴볼까요?' })).toBeVisible()
})

test('성향조사 관심사는 5개까지 — 넘으면 이유를 알려 준다', async ({ page }) => {
  await page.goto('/login/phone')
  await verifyPhone(page, { name: '이관심', year: '1955', month: '1', day: '1', phone: '01066665555', gender: '남성' })
  await toLocationStep(page)
  await page.getByRole('checkbox', { name: /위치 정보 수집 동의/ }).check()
  await page.getByRole('button', { name: '가입 완료' }).click()
  await page.getByRole('button', { name: '시작하기' }).click()
  for (const i of ['산책·등산', '영화·공연', '요리·맛집 탐방', '여행', '운동·건강관리', '봉사활동'])
    await page.getByRole('button', { name: i }).click()
  await expect(page.locator('[aria-pressed=true]')).toHaveCount(5)
  await expect(page.getByRole('alert')).toContainText('5개까지 고를 수 있어요')
})

test('시연용 함께 로그인하기 안내 화면', async ({ page }) => {
  await page.goto('/login')
  // 실서비스 로그인은 카카오만 사용한다. 시연 빌드에는 모의 로그인만 보인다.
  await expect(page.getByRole('link', { name: /시연용 로그인/ })).toBeVisible()
  await expect(page.getByRole('link', { name: /신분증 인증/ })).toHaveCount(0)
  await expect(page.getByRole('button', { name: '카카오 로그인' })).toHaveCount(0)
  await page.goto('/login')
  await page.getByRole('link', { name: '함께 로그인하기' }).click()
  await expect(page.getByRole('heading', { name: '함께 해요' })).toBeVisible()
})
