import { chromium } from 'playwright-core'

const browser = await chromium.launch({
	executablePath: '/opt/pw-browsers/chromium-1217/chrome-linux64/chrome',
	headless: true,
})
const page = await browser.newPage()
await page.goto('http://localhost:5173/#/use-table', { waitUntil: 'networkidle' })
await page.waitForTimeout(800)

// ── (1) .flat at rest, hover, focus ──
console.log('--- (1) .flat ---')
const flatRest = await page
	.locator('#use-table-edit table:first-of-type tbody input.flat')
	.first()
	.evaluate((el) => {
		const cs = getComputedStyle(el)
		return { bg: cs.backgroundColor, border: cs.borderTopColor, shadow: cs.boxShadow }
	})
console.log('Rest:', flatRest)
await page.locator('#use-table-edit table:first-of-type tbody input.flat').first().hover()
await page.waitForTimeout(150)
const flatHover = await page
	.locator('#use-table-edit table:first-of-type tbody input.flat')
	.first()
	.evaluate((el) => {
		const cs = getComputedStyle(el)
		return { bg: cs.backgroundColor, border: cs.borderTopColor }
	})
console.log('Hover:', flatHover)
await page.locator('#use-table-edit table:first-of-type tbody input.flat').first().focus()
await page.waitForTimeout(150)
const flatFocus = await page
	.locator('#use-table-edit table:first-of-type tbody input.flat')
	.first()
	.evaluate((el) => {
		const cs = getComputedStyle(el)
		return { bg: cs.backgroundColor, border: cs.borderTopColor, shadow: cs.boxShadow }
	})
console.log('Focus:', flatFocus)

// ── (2) .flush — fills container ──
console.log('\n--- (2) .flush ---')
const flushInfo = await page
	.locator('#use-table-edit table:nth-of-type(2) tbody input.flush')
	.first()
	.evaluate((el) => {
		const cs = getComputedStyle(el)
		const cell = el.closest('td')
		return {
			inlineSize: cs.inlineSize,
			blockSize: cs.blockSize,
			paddingBlock: cs.paddingBlock,
			paddingInline: cs.paddingInline,
			border: cs.borderTopWidth,
			bg: cs.backgroundColor,
			boxShadow: cs.boxShadow,
			cellWidth: cell?.offsetWidth,
			cellHeight: cell?.offsetHeight,
			inputWidth: el.offsetWidth,
			inputHeight: el.offsetHeight,
		}
	})
console.log('Flush input vs cell:', flushInfo)

// ── (3) button.flush — fills container ──
const flushBtn = await page
	.locator('#use-table-edit table:nth-of-type(2) tbody button.flush')
	.first()
	.evaluate((el) => {
		const cs = getComputedStyle(el)
		const cell = el.closest('td')
		return {
			padding: cs.padding,
			border: cs.borderTopWidth,
			cellWidth: cell?.offsetWidth,
			cellHeight: cell?.offsetHeight,
			btnWidth: el.offsetWidth,
			btnHeight: el.offsetHeight,
		}
	})
console.log('Flush button vs cell:', flushBtn)

await browser.close()
