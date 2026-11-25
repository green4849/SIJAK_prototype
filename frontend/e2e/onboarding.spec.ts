import { expect, test, type Page } from '@playwright/test'
import { agreeTerms, verifyPhone } from './helpers'

// 이 파일의 가입 흐름은 위치 동의를 쓴다 — 위치·역지오코딩(OpenStreetMap)은 고정값으로
test.use({ permissions: ['geolocation'], geolocation: { latitude: 37.2665, longitude: 127.0473 } })
/** 가입 1/3(약관) 동의 → 2/3(좋아하는 것)에서 하나 고르고 3/3(사는 동네)로 */
async function toLocationStep(page: Page) {
  await agreeTerms(page)
  await page.getByRole('button', { name: '요리·맛집 탐방' }).click()
  await page.getByRole('button', { name: /^다음/ }).click()
}

test.beforeEach(async ({ page }) => {
  await page.route('https://nominatim.openstreetmap.org/**', (r) =>
    r.fulfill({ json: { address: { state: '경기도', city: '수원시', borough: '영통구', quarter: '매탄동' } } }),
  )
})

test('① 시작 → ② 휴대폰 인증 → 가입 → ⑧ 보안 안내 → ③ 홈', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveURL(/\/welcome$/)
  await page.getByRole('link', { name: '시작하기' }).click()
  await page.getByRole('link', { name: /휴대폰 인증/ }).click()

  // 클라이언트 검증: 빈 채로 누르면 안내, 고치기 시작하면 사라짐
  await page.getByRole('button', { name: '인증번호 받기' }).click()
  await expect(page.getByRole('alert')).toHaveText('이름을 적어 주세요.')
  await page.getByLabel('이름').fill('홍')
  await expect(page.getByRole('alert')).toHaveCount(0)

  await verifyPhone(page, { name: '홍길순', year: '1957', month: '7', day: '7', phone: '01077778888', gender: '여성' })
  await expect(page).toHaveURL(/\/signup$/)
  // 1/3 약관 — 필수에 동의하지 않으면 넘어가지 않는다, 요약 먼저·전문은 펼쳐서 (B6)
  await expect(page.getByRole('heading', { name: /약관을 확인해 주세요/ })).toBeVisible()
  await page.getByRole('button', { name: '동의하고 다음' }).click()
  await expect(page.getByRole('alert')).toHaveText('[필수] 항목에 모두 동의해 주세요.')
  await page.getByRole('button', { name: '전체 내용 보기' }).first().click()
  await expect(page.getByRole('heading', { name: '제1조 목적' })).toBeVisible()
  await agreeTerms(page)
  // 2/3 좋아하는 것 — 안 고르면 버튼이 할 일을 알려 준다
  await expect(page.getByRole('heading', { name: /어떤 활동을 좋아하시나요/ })).toBeVisible()
  await expect(page.getByRole('button', { name: '하나 이상 골라 주세요' })).toBeDisabled()
  await page.getByRole('button', { name: '요리·맛집 탐방' }).click()
  await page.getByRole('button', { name: /^다음/ }).click()
  // 3/3 사는 동네 — 뒤로 누르면 2단계로, 고른 것은 그대로
  await page.getByRole('button', { name: '뒤로' }).click()
  await expect(page.getByRole('button', { name: '요리·맛집 탐방' })).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: /^다음/ }).click()
  // 위치 정보 수집 동의 → 그 자리에서 동네를 찾아 보여 준다
  await page.getByRole('checkbox', { name: /위치 정보 수집 동의/ }).check()
  await expect(page.getByText('경기도 수원시 영통구 매탄동')).toBeVisible()
  await page.getByRole('button', { name: '가입 완료' }).click()

  await expect(page.getByRole('heading', { name: '시작은 이렇게 지켜 드려요' })).toBeVisible()
  await expect(page.getByRole('button', { name: '뒤로' })).toHaveCount(0) // 가입 직후엔 뒤로 없음
  await page.getByRole('link', { name: '알겠어요, 시작할게요' }).click()
  // 첫 마음 건강 살펴보기(WHO-5) — 가입할 때 처음, 미룰 수 있다
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

test('관심사는 5개까지 — 넘으면 이유를 알려 준다', async ({ page }) => {
  await page.goto('/login/phone')
  await verifyPhone(page, { name: '이관심', year: '1955', month: '1', day: '1', phone: '01066665555', gender: '남성' })
  await agreeTerms(page)
  for (const i of ['산책·등산', '영화·공연', '요리·맛집 탐방', '여행', '운동·건강관리', '봉사활동'])
    await page.getByRole('button', { name: i }).click()
  await expect(page.locator('[aria-pressed=true]')).toHaveCount(5)
  await expect(page.getByRole('alert')).toContainText('5개까지 고를 수 있어요')
})

test('신분증·함께 인증하기 안내 화면', async ({ page }) => {
  await page.goto('/login')
  // 신분증 인증은 아직 없어 누를 수 없는 안내 카드
  await expect(page.getByText('곧 열려요 · 지금은 휴대폰 인증만 돼요')).toBeVisible()
  await expect(page.getByRole('link', { name: /신분증 인증/ })).toHaveCount(0)
  // 주소로 바로 들어오면 안내 화면
  await page.goto('/login/id-card')
  await expect(page.getByRole('heading', { name: '신분증 인증은 준비 중이에요' })).toBeVisible()
  await page.getByRole('link', { name: '함께 인증하기' }).click()
  await expect(page.getByRole('heading', { name: '함께 해요' })).toBeVisible()
})
