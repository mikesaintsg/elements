import { chromium } from 'playwright-core'

const browser = await chromium.launch({
	executablePath: '/opt/pw-browsers/chromium-1217/chrome-linux64/chrome',
	headless: true,
})
const page = await browser.newPage()

const errors = []
const warnings = []
page.on('pageerror', (e) => errors.push(String(e)))
page.on('console', (msg) => {
	if (msg.type() === 'error') errors.push(msg.text())
	if (msg.type() === 'warning') warnings.push(msg.text())
})

await page.goto('http://localhost:5173/#/use-aside', { waitUntil: 'networkidle' })
await page.waitForTimeout(300)

const h1 = await page.locator('h1').first().textContent()
console.log(`h1: "${h1?.trim()}"`)

// 1. Open start drawer programmatically — popover="auto" by default.
await page.locator('#use-aside-edges button', { hasText: 'Open start' }).click()
await page.waitForTimeout(150)
const startState = await page.evaluate(() => {
	const el = document.querySelector('#use-aside-edges aside.start')
	return {
		popoverOpen: el?.matches(':popover-open') ?? false,
		popoverAttr: el?.getAttribute('popover'),
	}
})
console.log(`Start opened: ${JSON.stringify(startState)}`)

// 2. Escape closes the auto-mode drawer (native light-dismiss).
const before = Date.now()
await page.keyboard.press('Escape')
// Wait briefly for the close to settle.
await page.waitForFunction(
	() => !document.querySelector('#use-aside-edges aside.start')?.matches(':popover-open'),
	{ timeout: 1000 },
)
const elapsed = Date.now() - before
console.log(`Escape closed start drawer in ${elapsed} ms (was ~400+ ms before the strip)`)

// 3. Sticky drawer: popover="manual" — Escape ignored.
await page.locator('button', { hasText: 'Open sticky drawer' }).click()
await page.waitForTimeout(150)
const stickyOpen = await page.evaluate(
	() => document.querySelector('#use-aside-manual aside')?.matches(':popover-open') ?? false,
)
console.log(`Sticky opened: ${stickyOpen}`)
await page.keyboard.press('Escape')
await page.waitForTimeout(200)
const stickyStillOpen = await page.evaluate(
	() => document.querySelector('#use-aside-manual aside')?.matches(':popover-open') ?? false,
)
console.log(`Sticky after Escape: still open=${stickyStillOpen} (expected true)`)
await page.locator('#use-aside-manual aside button.primary').click()
await page.waitForFunction(
	() => !document.querySelector('#use-aside-manual aside')?.matches(':popover-open'),
	{ timeout: 1000 },
)

// 4. Event bridge: open then close, log should have show → open → hide → close.
await page.locator('button', { hasText: 'Open events drawer' }).click()
await page.waitForTimeout(150)
await page.locator('#use-aside-events aside button.primary').click()
await page.waitForFunction(
	() => !document.querySelector('#use-aside-events aside')?.matches(':popover-open'),
	{ timeout: 1000 },
)
await page.waitForTimeout(100)
const log = await page.locator('#use-aside-events small').first().textContent()
console.log(`Event log: ${log?.trim()}`)

console.log(`\nErrors (${errors.length}):`)
for (const e of errors) console.log(`  - ${e}`)
console.log(`Warnings (${warnings.length}):`)
for (const w of warnings) console.log(`  - ${w}`)

await browser.close()
