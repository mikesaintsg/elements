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

// 1. Page rendered.
const h1 = await page.locator('h1').first().textContent()
console.log(`h1: "${h1?.trim()}"`)

// 2. Open start drawer programmatically.
await page.locator('#use-aside-edges button', { hasText: 'Open start' }).click()
await page.waitForTimeout(200)
const startState = await page.evaluate(() => {
	const el = document.querySelector('#use-aside-edges aside.start')
	return {
		hasOpen: el?.hasAttribute('data-aside-open') ?? false,
		hasClosing: el?.hasAttribute('data-aside-closing') ?? false,
		ariaModal: el?.getAttribute('aria-modal'),
		role: el?.getAttribute('role'),
		inert: el?.hasAttribute('inert'),
	}
})
console.log(`Start opened: ${JSON.stringify(startState)}`)

// 3. Press Escape — drawer should close (default policy).
await page.keyboard.press('Escape')
await page.waitForTimeout(400)
const startClosed = await page.evaluate(() => {
	const el = document.querySelector('#use-aside-edges aside.start')
	return {
		hasOpen: el?.hasAttribute('data-aside-open') ?? false,
		hasClosing: el?.hasAttribute('data-aside-closing') ?? false,
		inert: el?.hasAttribute('inert'),
	}
})
console.log(`Start after Escape (post-tail): ${JSON.stringify(startClosed)}`)

// 4. Sticky drawer — Escape ignored.
await page.locator('button', { hasText: 'Open sticky' }).click()
await page.waitForTimeout(200)
const stickyOpen = await page.evaluate(() => {
	const el = document.querySelector('#use-aside-dismiss aside.end:first-of-type')
	return el?.hasAttribute('data-aside-open') ?? false
})
console.log(`Sticky opened: ${stickyOpen}`)
await page.keyboard.press('Escape')
await page.waitForTimeout(200)
const stickyStillOpen = await page.evaluate(() => {
	const el = document.querySelector('#use-aside-dismiss aside.end:first-of-type')
	return el?.hasAttribute('data-aside-open') ?? false
})
console.log(`Sticky after Escape: still open=${stickyStillOpen} (expected true)`)
// Close via inner button.
await page.locator('#use-aside-dismiss aside.end:first-of-type button.primary').click()
await page.waitForTimeout(400)

// 5. Lifecycle veto.
await page.locator('#use-aside-lifecycle input').first().uncheck()
await page.locator('button', { hasText: 'Try to open' }).click()
await page.waitForTimeout(150)
const lifecycleClosed = await page.evaluate(() => {
	const el = document.querySelector('#use-aside-lifecycle aside.end')
	return !(el?.hasAttribute('data-aside-open') ?? false)
})
const lifecycleLog = await page.locator('#use-aside-lifecycle > small').first().textContent()
console.log(`Lifecycle veto: stayed closed=${lifecycleClosed} log=${lifecycleLog?.trim()}`)

// 6. Attribute readout shows present after programmatic open.
await page.locator('#use-aside-attrs button', { hasText: 'Open start drawer' }).click()
await page.waitForTimeout(120)
const readout = await page.locator('#use-aside-attrs dl.lifecycle-readout dd').allTextContents()
console.log(`Attr readout (open): ${readout.join(' | ')}`)

console.log(`\nErrors (${errors.length}):`)
for (const e of errors) console.log(`  - ${e}`)
console.log(`Warnings (${warnings.length}):`)
for (const w of warnings) console.log(`  - ${w}`)

await browser.close()
