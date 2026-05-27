import { chromium } from 'playwright'

const playgrounds = [
  'playground-alert', 'playground-aside', 'playground-button', 'playground-carousel',
  'playground-details', 'playground-dialog', 'playground-drag', 'playground-drop',
  'playground-focus', 'playground-form', 'playground-menu', 'playground-nav',
  'playground-pointer', 'playground-popover', 'playground-select', 'playground-table',
  'playground-tabs', 'playground-theme', 'playground-toast', 'playground-tooltip',
]

const browser = await chromium.launch({ headless: true })
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
const page = await ctx.newPage()

const results = []
for (const id of playgrounds) {
  await page.goto(`http://localhost:5173/#/${id}?autoplay=all`, { waitUntil: 'networkidle' })
  // Wait for harness to settle (max 60s).
  const start = Date.now()
  let status = 'idle'
  while (Date.now() - start < 60_000) {
    status = await page.evaluate(() => {
      const h = document.querySelector('[data-statechart-status]')
      return h?.getAttribute('data-statechart-status') ?? 'missing'
    })
    if (status === 'passed' || status === 'failed') break
    await new Promise((r) => setTimeout(r, 200))
  }
  const counters = await page.evaluate(() => {
    const h = document.querySelector('[data-statechart-status]')
    return {
      passed: Number(h?.getAttribute('data-statechart-passed') ?? '0'),
      failed: Number(h?.getAttribute('data-statechart-failed') ?? '0'),
      total: Number(h?.getAttribute('data-statechart-total') ?? '0'),
    }
  })
  // Capture a screenshot of the harness for visual review.
  const harness = await page.locator('[data-statechart-status]').first()
  const safeId = id.replace(/[^a-z0-9]+/gi, '-')
  await harness.screenshot({ path: `/tmp/playground-${safeId}.png` })
  results.push({ id, status, ...counters })
}

console.log(JSON.stringify(results, null, 2))
await browser.close()
