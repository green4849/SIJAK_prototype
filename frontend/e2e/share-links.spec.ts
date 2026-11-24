/** H35 — 링크 공유 미리보기 정보와 그림 */
import { expect, test } from '@playwright/test'

test('H35: 첫 화면 HTML에 공유 미리보기(og) 정보가 있고, 그림이 실제로 열린다', async ({ request }) => {
  const html = await (await request.get('/')).text()
  const og = (p: string) => html.match(new RegExp(`<meta property="og:${p}" content="([^"]+)"`))?.[1]
  expect(og('title')).toBe('시작 — 같은 동네, 좋은 이웃과')
  expect(og('description')).toBeTruthy()
  expect(og('locale')).toBe('ko_KR')
  const image = og('image')!
  expect(image).toMatch(/icons\/og-image\.png$/)
  const res = await request.get(image.replace(/^https?:\/\/[^/]+/, ''))
  expect(res.ok()).toBe(true)
  expect(res.headers()['content-type']).toContain('image/png')
})
