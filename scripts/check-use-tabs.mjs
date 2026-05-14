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

await page.goto('http://localhost:5173/#/use-tabs', { waitUntil: 'networkidle' })
await page.waitForTimeout(300)

const h1 = await page.locator('h1').first().textContent()
console.log(`h1: "${h1?.trim()}"`)

// 1. Initial state: pane 1 visible, panes 2 + 3 hidden via `[hidden]`.
const initial = await page.evaluate(() => {
	const panes = document.querySelectorAll('#use-tabs-default [role="tabpanel"]')
	return Array.from(panes).map((p) => ({
		text: p.querySelector('h3')?.textContent ?? '?',
		hidden: p.hasAttribute('hidden'),
		display: getComputedStyle(p).display,
	}))
})
console.log(`Initial pane state: ${JSON.stringify(initial)}`)

// 2. Click tab 2. Pane 2 should be visible; panes 1 + 3 hidden.
await page.locator('#use-tabs-default button', { hasText: 'Specifications' }).click()
await page.waitForTimeout(80)
const afterClick = await page.evaluate(() => {
	const panes = document.querySelectorAll('#use-tabs-default [role="tabpanel"]')
	return Array.from(panes).map((p) => ({
		text: p.querySelector('h3')?.textContent ?? '?',
		hidden: p.hasAttribute('hidden'),
		display: getComputedStyle(p).display,
	}))
})
console.log(`After clicking 'Specifications': ${JSON.stringify(afterClick)}`)

// 3. Verify ARIA selection.
const aria = await page.evaluate(() => {
	const triggers = document.querySelectorAll('#use-tabs-default [role="tab"]')
	return Array.from(triggers).map((t) => ({
		text: t.textContent?.trim() ?? '?',
		selected: t.getAttribute('aria-selected'),
		tabindex: t.getAttribute('tabindex'),
	}))
})
console.log(`ARIA state: ${JSON.stringify(aria)}`)

// 4. Lifecycle veto: uncheck "allow activation", click the vetoable tab.
const allow = page.locator('#use-tabs-lifecycle input[type="checkbox"]').first()
await allow.uncheck()
await page.locator('#use-tabs-lifecycle button', { hasText: 'Vetoable' }).click()
await page.waitForTimeout(80)
const veto = await page.evaluate(() => {
	const triggers = document.querySelectorAll('#use-tabs-lifecycle [role="tab"]')
	return Array.from(triggers).map((t) => ({
		text: t.textContent?.trim() ?? '?',
		selected: t.getAttribute('aria-selected'),
	}))
})
const log = await page.locator('#use-tabs-lifecycle > small').first().textContent()
console.log(`After veto attempt: ${JSON.stringify(veto)}`)
console.log(`Log: ${log?.trim()}`)

// 5. Indicator tokens written on the tablist.
const tokens = await page.evaluate(() => {
	const group = document.querySelector('#use-tabs-default [role="tablist"]')
	if (!(group instanceof HTMLElement)) return null
	return {
		x: group.style.getPropertyValue('--set-tabs-indicator-x'),
		width: group.style.getPropertyValue('--set-tabs-indicator-width'),
	}
})
console.log(`Indicator tokens: ${JSON.stringify(tokens)}`)

console.log(`\nErrors (${errors.length}):`)
for (const e of errors) console.log(`  - ${e}`)
console.log(`Warnings (${warnings.length}):`)
for (const w of warnings) console.log(`  - ${w}`)

await browser.close()
