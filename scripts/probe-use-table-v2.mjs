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
await page.waitForTimeout(600)

// ── (1) Comprehensive section uses <nav aria-label="Pagination">, not <menu> ──
const compNavs = await page.locator('#use-table-comprehensive nav[aria-label="Pagination"]').count()
const compMenus = await page.locator('#use-table-comprehensive menu').count()
console.log(`(1) Comprehensive — pagination nav: ${compNavs}, leftover <menu>: ${compMenus}`)

// ── (2) Isolated pagination section uses <nav aria-label="Pagination"> ──
const isoNavs = await page.locator('#use-table-paginate nav[aria-label="Pagination"]').count()
const isoMenus = await page.locator('#use-table-paginate menu').count()
console.log(`(2) Isolated paginate — pagination nav: ${isoNavs}, leftover <menu>: ${isoMenus}`)

// ── (3) Expansion chevron: first cell of expandable row should have ::before ──
const chevronInfo = await page
	.locator('#use-table-expand tbody > tr[data-id]')
	.first()
	.evaluate((row) => {
		const td = row.querySelector('td:first-child')
		if (!td) return null
		const before = getComputedStyle(td, '::before')
		return {
			display: getComputedStyle(td).display,
			beforeContent: before.content,
			beforeInlineSize: before.inlineSize,
			beforeBlockSize: before.blockSize,
		}
	})
console.log(`(3) Expansion chevron on expandable row's first <td>:`, chevronInfo)

// ── (4) Click an expandable row, check chevron rotation transform ──
await page.locator('#use-table-expand tbody > tr[data-id]').first().click()
await page.waitForTimeout(200)
const rotatedInfo = await page
	.locator('#use-table-expand tbody > tr[data-id]')
	.first()
	.evaluate((row) => {
		const td = row.querySelector('td:first-child')
		if (!td) return null
		const before = getComputedStyle(td, '::before')
		return {
			expanded: row.hasAttribute('data-table-expanded'),
			beforeTransform: before.transform,
		}
	})
console.log(`(4) After click on expandable row:`, rotatedInfo)

// ── (5) Flush form-control demo: hover reveal, focus promote ──
const flushInfo = await page
	.locator('#use-table-edit tbody input.flush')
	.first()
	.evaluate((input) => {
		const rest = getComputedStyle(input)
		return {
			restBg: rest.backgroundColor,
			restBorderColor: rest.borderTopColor,
		}
	})
console.log(`(5) Flush input at rest:`, flushInfo)
await page.locator('#use-table-edit tbody input.flush').first().hover()
await page.waitForTimeout(150)
const flushHoverInfo = await page
	.locator('#use-table-edit tbody input.flush')
	.first()
	.evaluate((input) => {
		const hover = getComputedStyle(input)
		return {
			hoverBg: hover.backgroundColor,
			hoverBorderColor: hover.borderTopColor,
		}
	})
console.log(`(5) Flush input on hover:`, flushHoverInfo)
await page.locator('#use-table-edit tbody input.flush').first().focus()
await page.waitForTimeout(150)
const flushFocusInfo = await page
	.locator('#use-table-edit tbody input.flush')
	.first()
	.evaluate((input) => {
		const focus = getComputedStyle(input)
		return {
			focusBg: focus.backgroundColor,
			focusBorderColor: focus.borderTopColor,
			focusBoxShadow: focus.boxShadow,
		}
	})
console.log(`(5) Flush input on focus:`, flushFocusInfo)

// ── (6) Pagination tile chrome: at least 3 tiles, one with aria-current="page" ──
const tileInfo = await page
	.locator('#use-table-comprehensive nav[aria-label="Pagination"]')
	.evaluate((nav) => {
		const links = Array.from(nav.querySelectorAll('a'))
		const labels = links.map((a) => a.textContent?.trim())
		const current = links.find((a) => a.getAttribute('aria-current') === 'page')
		return {
			linkCount: links.length,
			labels,
			currentLabel: current?.textContent?.trim() ?? null,
		}
	})
console.log(`(6) Pagination tiles:`, tileInfo)

console.log(`\nErrors (${errors.length}):`)
for (const e of errors) console.log(`  - ${e}`)

await browser.close()
