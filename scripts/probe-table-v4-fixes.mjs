import { chromium } from 'playwright-core'

const browser = await chromium.launch({
	executablePath: '/opt/pw-browsers/chromium-1217/chrome-linux64/chrome',
	headless: true,
})
const page = await browser.newPage()
const errors = []
page.on('pageerror', (err) => errors.push(`PAGEERROR: ${err.message}`))
page.on('console', (msg) => {
	if (msg.type() === 'error') errors.push(`CONSOLE ERROR: ${msg.text()}`)
})
await page.goto('http://localhost:5173/#/use-table', { waitUntil: 'networkidle' })
await page.waitForTimeout(800)

// ── (1) Action toolbar — should be horizontal flex row ──
console.log('--- (1) Toolbar layout ---')
const tb = await page
	.locator('#use-table-comprehensive fieldset[role="toolbar"]')
	.evaluate((el) => {
		const cs = getComputedStyle(el)
		const buttons = Array.from(el.querySelectorAll('button'))
		const firstY = buttons[0]?.getBoundingClientRect().top
		const secondY = buttons[1]?.getBoundingClientRect().top
		return {
			display: cs.display,
			direction: cs.flexDirection,
			gap: cs.gap,
			firstButtonY: firstY,
			secondButtonY: secondY,
			sameRow: firstY != null && Math.abs((firstY || 0) - (secondY || 0)) < 4,
		}
	})
console.log(JSON.stringify(tb, null, 2))

// ── (2) Exclusive expansion — opening 6b/t2 should close 6b/t1 ──
console.log('\n--- (2) Exclusive expansion ---')
const initialExclusive = await page
	.locator('#use-table-expand table:nth-of-type(2)')
	.evaluate((t) => {
		const open = Array.from(t.querySelectorAll('tr[data-id][data-table-expanded]')).map((r) =>
			r.getAttribute('data-id'),
		)
		return open
	})
console.log('Initial exclusive (should be [t1]):', initialExclusive)
await page
	.locator('#use-table-expand table:nth-of-type(2) tr[data-id="t2"] > td:first-child')
	.click()
await page.waitForTimeout(300)
const afterT2 = await page.locator('#use-table-expand table:nth-of-type(2)').evaluate((t) => {
	const open = Array.from(t.querySelectorAll('tr[data-id][data-table-expanded]')).map((r) =>
		r.getAttribute('data-id'),
	)
	return open
})
console.log('After click t2 (should be [t2] only):', afterT2)
await page
	.locator('#use-table-expand table:nth-of-type(2) tr[data-id="t3"] > td:first-child')
	.click()
await page.waitForTimeout(300)
const afterT3 = await page.locator('#use-table-expand table:nth-of-type(2)').evaluate((t) => {
	const open = Array.from(t.querySelectorAll('tr[data-id][data-table-expanded]')).map((r) =>
		r.getAttribute('data-id'),
	)
	return open
})
console.log('After click t3 (should be [t3] only):', afterT3)

// And multi mode still allows multiple
console.log('\n--- (3) Multi mode still independent ---')
await page
	.locator('#use-table-expand table:nth-of-type(1) tr[data-id="t2"] > td:first-child')
	.click()
await page.waitForTimeout(300)
const multiAfter = await page.locator('#use-table-expand table:nth-of-type(1)').evaluate((t) => {
	const open = Array.from(t.querySelectorAll('tr[data-id][data-table-expanded]')).map((r) =>
		r.getAttribute('data-id'),
	)
	return open
})
console.log('Multi after click t2 (should include t1 + t2):', multiAfter)

// ── (4) Flush hover backdrop ──
console.log('\n--- (4) Flush hover backdrop ---')
const flushRest = await page
	.locator('#use-table-edit table:nth-of-type(2) tbody input.flush')
	.first()
	.evaluate((el) => {
		const cs = getComputedStyle(el)
		return { bg: cs.backgroundColor }
	})
console.log('Flush rest:', flushRest)
await page.locator('#use-table-edit table:nth-of-type(2) tbody input.flush').first().hover()
await page.waitForTimeout(150)
const flushHover = await page
	.locator('#use-table-edit table:nth-of-type(2) tbody input.flush')
	.first()
	.evaluate((el) => {
		const cs = getComputedStyle(el)
		return { bg: cs.backgroundColor }
	})
console.log('Flush hover:', flushHover)

console.log(`\nConsole errors: ${errors.length}`)
for (const e of errors) console.log('  -', e)
await browser.close()
