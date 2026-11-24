// 앱 아이콘·공유 미리보기 PNG 생성 — 원본: icons/leaf.svg, 결과: public/icons/*.png
// 실행: npm run icons  (PW_CHROMIUM_PATH 로 Chromium 경로 지정 가능)
import { readFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'

const BG = '#fbf7ec'
const leaf = readFileSync(new URL('../icons/leaf.svg', import.meta.url), 'utf8')

/** 64×64 좌표계에서 새싹(중심 ≈ 32.5,32)을 scale 배로 가운데 두기 */
const svg = ({ rounded, scale }) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" ${rounded ? 'rx="14"' : ''} fill="${BG}"/>
  <g transform="translate(32 32) scale(${scale}) translate(-32.5 -32)">${leaf}</g></svg>`

const outputs = [
  { file: 'icon-192.png', size: 192, rounded: true, scale: 1 },
  { file: 'icon-512.png', size: 512, rounded: true, scale: 1 },
  { file: 'maskable-512.png', size: 512, rounded: false, scale: 0.6 },
  { file: 'apple-touch-icon.png', size: 180, rounded: false, scale: 0.8 },
]

const outDir = new URL('../public/icons/', import.meta.url)
mkdirSync(outDir, { recursive: true })
const browser = await chromium.launch(
  process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {},
)
const page = await browser.newPage()
for (const o of outputs) {
  await page.setViewportSize({ width: o.size, height: o.size })
  await page.setContent(
    `<style>html,body{margin:0;background:transparent}svg{display:block;width:100vw;height:100vh}</style>${svg(o)}`,
  )
  await page.screenshot({ path: fileURLToPath(new URL(o.file, outDir)), omitBackground: true })
  console.log('✓', o.file)
}

// 공유 미리보기(og:image, 1200×630) — 카카오톡 등에 링크를 보낼 때 뜨는 그림 (H35)
const font = (f) => readFileSync(new URL(`../node_modules/${f}`, import.meta.url)).toString('base64')
await page.setViewportSize({ width: 1200, height: 630 })
await page.setContent(`<style>
  @font-face { font-family: Jua; src: url(data:font/woff2;base64,${font('@fontsource/jua/files/jua-119-400-normal.woff2')}) format('woff2'); unicode-range: U+C2DC; }
  @font-face { font-family: Jua; src: url(data:font/woff2;base64,${font('@fontsource/jua/files/jua-118-400-normal.woff2')}) format('woff2'); unicode-range: U+C791; }
  html, body { margin: 0; width: 1200px; height: 630px; background: ${BG}; }
  body { display: flex; align-items: center; justify-content: center; gap: 40px; font-family: 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif; color: #2e5a1c; }
  svg { width: 260px; height: 260px; }
  h1 { margin: 0; font-family: Jua, sans-serif; font-weight: 400; font-size: 200px; line-height: 1; }
  p { margin: 16px 0 0; font-size: 44px; color: #4a4a40; }
</style><svg viewBox="0 0 64 64">${leaf}</svg><div><h1>시작</h1><p>같은 동네, 좋은 이웃과</p></div>`)
await page.evaluate(() => document.fonts.ready)
await page.screenshot({ path: new URL('og-image.png', outDir).pathname })
console.log('✓ og-image.png')
await browser.close()
