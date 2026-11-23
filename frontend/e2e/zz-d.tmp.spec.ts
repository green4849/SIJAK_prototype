import { test } from '@playwright/test'
import { startTour } from './helpers'
test('d', async ({ page }) => {
  await startTour(page)
  await page.goto('/friends'); await page.waitForTimeout(800)
  const card = page.getByRole('article', { name: '김영희님' })
  console.log('CARD>>', (await card.innerText()).replace(/\n+/g, ' | '))
  await card.getByRole('button', { name: '만나보고 싶어요' }).click(); await page.waitForTimeout(500)
  console.log('TOAST>>', await page.getByRole('status').allInnerTexts())
  console.log('POINTS>>', await page.evaluate(() => document.body.innerText.match(/\d+P/g)?.slice(0, 5)))
  await page.goto('/me/points'); await page.waitForTimeout(600)
  console.log('MYPOINTS>>', (await page.locator('main').innerText()).replace(/\n+/g, ' | ').slice(0, 400))
})
