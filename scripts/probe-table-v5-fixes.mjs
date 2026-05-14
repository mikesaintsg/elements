import { chromium } from 'playwright-core'

const browser = await chromium.launch({
	executablePath: '/opt/pw-browsers/chromium-1217/chrome-linux64/chrome',
	headless: true,
})
const page = await browser.newPage()
await page.goto('http://localhost:5173/#/use-table', { waitUntil: 'networkidle' })
await page.waitForTimeout(800)

// ── (1) Toolbar is now <div role="toolbar"> — should be horizontal ──
console.log('--- (1) Toolbar role=div ---')
const tb = await page.locator('#use-table-comprehensive [role="toolbar"]').evaluate((el) => {
	const cs = getComputedStyle(el)
	const buttons = Array.from(el.querySelectorAll('button'))
	const firstY = buttons[0]?.getBoundingClientRect().top
	const secondY = buttons[1]?.getBoundingClientRect().top
	return {
		tagName: el.tagName,
		display: cs.display,
		direction: cs.flexDirection,
		gap: cs.gap,
		firstButtonY: firstY,
		secondButtonY: secondY,
		sameRow: firstY != null && Math.abs((firstY || 0) - (secondY || 0)) < 4,
		fieldsetCount: document.querySelectorAll('#use-table-comprehensive fieldset[role="toolbar"]')
			.length,
	}
})
console.log(JSON.stringify(tb, null, 2))

// ── (2) Flush hover stays on focus ──
console.log('\n--- (2) Flush focus backdrop ---')
const flushInput = page.locator('#use-table-edit table:nth-of-type(2) tbody input.flush').first()
const restBg = await flushInput.evaluate((el) => getComputedStyle(el).backgroundColor)
console.log('Rest:', restBg)
await flushInput.hover()
await page.waitForTimeout(150)
const hoverBg = await flushInput.evaluate((el) => getComputedStyle(el).backgroundColor)
console.log('Hover:', hoverBg)
await flushInput.focus()
await page.waitForTimeout(150)
const focusBg = await flushInput.evaluate((el) => getComputedStyle(el).backgroundColor)
console.log('Focus:', focusBg)
// Move mouse away from the input but keep focus
await page.mouse.move(50, 50)
await page.waitForTimeout(150)
const focusOnlyBg = await flushInput.evaluate((el) => getComputedStyle(el).backgroundColor)
console.log('Focus only (no hover):', focusOnlyBg)

await browser.close()
