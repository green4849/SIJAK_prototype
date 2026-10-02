// 앱 아이콘 PNG 생성 — 원본: icons/leaf.svg, 결과: public/icons/*.png
// 실행: npm run icons  (PW_CHROMIUM_PATH 로 Chromium 경로 지정 가능)
import { readFileSync, mkdirSync } from 'node:fs'
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
  await page.screenshot({ path: new URL(o.file, outDir).pathname, omitBackground: true })
  console.log('✓', o.file)
}
await browser.close()
