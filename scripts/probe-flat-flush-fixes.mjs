// Verify the fixes:
// 1. details.flush + details.flush has a divider
// 2. variant color flows to details.flush, dialog.flush, article.flush
// 3. a.flat hover NO bg (just underline)
// 4. button.flat text color shows for variants
// 5. button.flush + input.flush exist in respective pages

import { chromium } from 'playwright-core'

const browser = await chromium.launch({
	executablePath: '/opt/pw-browsers/chromium-1217/chrome-linux64/chrome',
	headless: true,
})
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })

async function read(path, selector, props) {
	await page.goto(`http://localhost:5173/${path}`, { waitUntil: 'networkidle' })
	await page.waitForTimeout(400)
	const result = await page
		.locator(selector)
		.first()
		.evaluate((el, props) => {
			const cs = getComputedStyle(el)
			const out = {}
			for (const p of props) out[p] = cs[p]
			return out
		}, props)
	return result
}

console.log('--- (1) details.flush sibling divider ---')
console.log(
	'first (no divider):',
	JSON.stringify(
		await read('#/details', '#details-flush details.flush:nth-of-type(1)', ['borderTopWidth']),
	),
)
console.log(
	'second (with divider):',
	JSON.stringify(
		await read('#/details', '#details-flush details.flush:nth-of-type(2)', [
			'borderTopWidth',
			'borderTopColor',
		]),
	),
)

console.log('\n--- (2) details.flush variant text color ---')
console.log(
	'success:',
	JSON.stringify(await read('#/details', '#details-flush details.success.flush', ['color'])),
)
console.log(
	'warning:',
	JSON.stringify(await read('#/details', '#details-flush details.warning.flush', ['color'])),
)
console.log(
	'danger:',
	JSON.stringify(await read('#/details', '#details-flush details.danger.flush', ['color'])),
)

console.log('\n--- (3) a.flat hover — should be NO bg ---')
await page.goto('http://localhost:5173/#/anchor', { waitUntil: 'networkidle' })
await page.waitForTimeout(400)
const flatLink = page.locator('#anchor-flat a.flat').first()
await flatLink.hover()
await page.waitForTimeout(200)
const aFlatHover = await flatLink.evaluate((el) => {
	const cs = getComputedStyle(el)
	return { backgroundColor: cs.backgroundColor, textDecorationLine: cs.textDecorationLine }
})
console.log('a.flat hover:', JSON.stringify(aFlatHover))

console.log('\n--- (4) button.flat variant color ---')
console.log(
	'primary flat:',
	JSON.stringify(await read('#/button', '#button-flat button.primary.flat', ['color'])),
)
console.log(
	'success flat:',
	JSON.stringify(await read('#/button', '#button-flat button.success.flat', ['color'])),
)
console.log(
	'danger flat:',
	JSON.stringify(await read('#/button', '#button-flat button.danger.flat', ['color'])),
)

console.log('\n--- (5) button.flush exists ---')
const buttonFlushExists = await page
	.goto('http://localhost:5173/#/button', { waitUntil: 'networkidle' })
	.then(() => page.waitForTimeout(400))
	.then(() => page.locator('#button-flush button.flush').count())
console.log(`button.flush count: ${buttonFlushExists}`)

console.log('\n--- (6) form-controls flat-flush section exists ---')
const formFlatFlushExists = await page
	.goto('http://localhost:5173/#/form-controls', { waitUntil: 'networkidle' })
	.then(() => page.waitForTimeout(400))
	.then(() => page.locator('#form-controls-flat-flush-controls input.flat').count())
console.log(`input.flat in form-controls flat-flush section: ${formFlatFlushExists}`)
const formFlushInputExists = await page
	.locator('#form-controls-flat-flush-controls input.flush')
	.count()
console.log(`input.flush count: ${formFlushInputExists}`)

console.log('\n--- (7) aside-alert.flush sibling divider ---')
await page.goto('http://localhost:5173/#/aside', { waitUntil: 'networkidle' })
await page.waitForTimeout(400)
const alertSiblings = await page
	.locator('#aside-alert-flat-flush aside[role="alert"].flush')
	.evaluateAll((els) =>
		els.map((el) => {
			const cs = getComputedStyle(el)
			return { idx: el.dataset.idx || '?', borderTopWidth: cs.borderTopWidth }
		}),
	)
console.log('alert.flush siblings borderTopWidth:', JSON.stringify(alertSiblings))

await browser.close()
