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

// ── (1) Expansion demo — what happens on click? ──
console.log('--- (1) EXPANSION ---')
const expSnapshot1 = await page.locator('#use-table-expand').evaluate((sec) => {
	const rows = Array.from(sec.querySelectorAll('table > tbody > tr'))
	return rows.map((r) => ({
		dataId: r.getAttribute('data-id'),
		expanded: r.hasAttribute('data-table-expanded'),
		expansion: r.hasAttribute('data-table-expansion'),
		firstCellText: r.querySelector('td')?.textContent?.trim().slice(0, 40),
	}))
})
console.log('Initial:', JSON.stringify(expSnapshot1, null, 2))

// Click second expandable row (t2)
const t2row = page.locator('#use-table-expand tr[data-id="t2"] > td:first-child')
await t2row.click()
await page.waitForTimeout(300)
const expSnapshot2 = await page.locator('#use-table-expand').evaluate((sec) => {
	const rows = Array.from(sec.querySelectorAll('table > tbody > tr'))
	return rows.map((r) => ({
		dataId: r.getAttribute('data-id'),
		expanded: r.hasAttribute('data-table-expanded'),
	}))
})
console.log('After click on t2 first cell:', JSON.stringify(expSnapshot2))

// Click anywhere else on t3 row (second cell)
const t3second = page.locator('#use-table-expand tr[data-id="t3"] > td:nth-child(2)')
await t3second.click()
await page.waitForTimeout(300)
const expSnapshot3 = await page.locator('#use-table-expand').evaluate((sec) => {
	const rows = Array.from(sec.querySelectorAll('table > tbody > tr'))
	return rows.map((r) => ({
		dataId: r.getAttribute('data-id'),
		expanded: r.hasAttribute('data-table-expanded'),
	}))
})
console.log('After click on t3 second cell:', JSON.stringify(expSnapshot3))

// ── (2) Resize demo — handles present? ──
console.log('\n--- (2) RESIZE ---')
const rzInfo = await page.locator('#use-table-resize').evaluate((sec) => {
	const thead = sec.querySelector('table > thead')
	const ths = thead ? Array.from(thead.querySelectorAll('th')) : []
	return {
		hasThead: !!thead,
		thCount: ths.length,
		thHandles: ths.map((th) => ({
			text: th.textContent?.trim().slice(0, 20),
			handleCount: th.querySelectorAll('[data-table-resize-handle]').length,
			width: th.offsetWidth,
		})),
	}
})
console.log('Resize thead:', JSON.stringify(rzInfo, null, 2))

// Try a drag
const firstHandle = page.locator('#use-table-resize th [data-table-resize-handle]').first()
const handleCount = await firstHandle.count()
console.log('First handle locator count:', handleCount)

// ── (3) Focus demo — tabbable / keyboard nav ──
console.log('\n--- (3) FOCUS ---')
const fcInfo = await page.locator('#use-table-focus').evaluate((sec) => {
	const t = sec.querySelector('table')
	const cells = t ? Array.from(t.querySelectorAll('tbody td')) : []
	return {
		tableTabindex: t?.getAttribute('tabindex'),
		tableRole: t?.getAttribute('role'),
		hasThead: !!t?.tHead,
		cellTabindex: cells.map((c) => c.getAttribute('tabindex')),
		cellCount: cells.length,
	}
})
console.log('Focus table state:', JSON.stringify(fcInfo, null, 2))

// Click into the table and try arrow keys
await page.locator('#use-table-focus table').focus()
await page.waitForTimeout(150)
const fcAfterFocus = await page.locator('#use-table-focus').evaluate((sec) => {
	const t = sec.querySelector('table')
	const cells = t ? Array.from(t.querySelectorAll('tbody td')) : []
	return {
		activeIs: document.activeElement?.tagName,
		activeText: document.activeElement?.textContent?.trim().slice(0, 10),
		cellTabindex: cells.map((c) => c.getAttribute('tabindex')),
	}
})
console.log('After Focus:', JSON.stringify(fcAfterFocus, null, 2))

await page.keyboard.press('ArrowRight')
await page.waitForTimeout(150)
const fcAfterArrow = await page.locator('#use-table-focus').evaluate(() => ({
	activeText: document.activeElement?.textContent?.trim().slice(0, 10),
}))
console.log('After ArrowRight:', JSON.stringify(fcAfterArrow))

// ── (4) Sticky header — does it have a bg? ──
console.log('\n--- (4) STICKY ---')
const stInfo = await page.locator('#use-table-sticky').evaluate((sec) => {
	const t = sec.querySelector('table.sticky')
	const th = t?.querySelector('thead > tr > th')
	if (!th) return null
	const cs = getComputedStyle(th)
	return {
		position: cs.position,
		bg: cs.backgroundColor,
		insetBlockStart: cs.insetBlockStart,
		zIndex: cs.zIndex,
	}
})
console.log('Sticky th computed:', JSON.stringify(stInfo, null, 2))

// ── (5) Pagination chrome density (comprehensive section) ──
console.log('\n--- (5) PAGINATION DENSITY ---')
const pgDensity = await page
	.locator('#use-table-comprehensive nav[aria-label="Pagination"] a')
	.first()
	.evaluate((a) => {
		const cs = getComputedStyle(a)
		return {
			paddingInline: cs.paddingInline,
			paddingBlock: cs.paddingBlock,
			minInlineSize: cs.minInlineSize,
			fontSize: cs.fontSize,
		}
	})
console.log('Pagination tile:', JSON.stringify(pgDensity))
const tableCell = await page
	.locator('#use-table-comprehensive table tbody td')
	.first()
	.evaluate((td) => {
		const cs = getComputedStyle(td)
		return {
			paddingInline: cs.paddingInline,
			paddingBlock: cs.paddingBlock,
			fontSize: cs.fontSize,
		}
	})
console.log('Table cell:', JSON.stringify(tableCell))

// ── (6) "Old pagination" report — what's in comp section that looks like old paginate? ──
console.log('\n--- (6) OLD PAGINATION SUSPECTS ---')
const menus = await page.locator('#use-table-comprehensive menu').evaluateAll((els) =>
	els.map((m) => ({
		liCount: m.querySelectorAll('li').length,
		firstLabel: m.querySelector('li button')?.textContent?.trim(),
		sample: Array.from(m.querySelectorAll('li button'))
			.slice(0, 4)
			.map((b) => b.textContent?.trim()),
	})),
)
console.log('Menus in comp section:', JSON.stringify(menus, null, 2))

console.log(`\nConsole errors: ${errors.length}`)
for (const e of errors) console.log('  -', e)

await browser.close()
