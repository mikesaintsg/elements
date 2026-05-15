// Probe each new flat/flush section on its respective page — confirms
// the demo markup actually renders and the modifier rules paint as
// expected when wired into the showcase.

import { chromium } from 'playwright-core'

const browser = await chromium.launch({
	executablePath: '/opt/pw-browsers/chromium-1217/chrome-linux64/chrome',
	headless: true,
})
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })

async function check(hash, sectionId, selector, props, label) {
	await page.goto(`http://localhost:5173/#/${hash}`, { waitUntil: 'networkidle' })
	await page.waitForTimeout(400)
	const ok = await page.locator(`#${sectionId}`).count()
	if (ok === 0) {
		console.log(`[${hash}] MISSING section #${sectionId}`)
		return
	}
	const result = await page
		.locator(`#${sectionId} ${selector}`)
		.first()
		.evaluate((el, props) => {
			const cs = getComputedStyle(el)
			const out = {}
			for (const p of props) out[p] = cs[p]
			return out
		}, props)
	console.log(`[${hash}#${sectionId}] ${label}:`, JSON.stringify(result))
}

await check(
	'details',
	'details-flat',
	'details.flat',
	['backgroundColor', 'borderTopColor'],
	'flat rest',
)
await check(
	'details',
	'details-flush',
	'details.flush',
	['borderTopWidth', 'borderRadius', 'margin'],
	'flush nested',
)
await check(
	'aside',
	'aside-alert-flat-flush',
	'aside[role="alert"].flat',
	['backgroundColor', 'borderInlineStartColor'],
	'alert flat rest',
)
await check(
	'aside',
	'aside-alert-flat-flush',
	'aside[role="alert"].flush',
	['borderRadius', 'borderInlineStartWidth'],
	'alert flush',
)
await check(
	'dialog-element',
	'dialog-element-flush',
	'dialog.flush',
	['borderTopWidth', 'borderRadius', 'margin', 'inlineSize'],
	'dialog.flush non-modal',
)
await check('anchor', 'anchor-flat', 'a.flat', ['textDecorationLine'], 'a.flat rest')
await check(
	'anchor',
	'anchor-flush',
	'a.flush',
	['display', 'color', 'textDecorationLine'],
	'a.flush tile',
)
await check(
	'button',
	'button-flat',
	'button.flat',
	['backgroundColor', 'borderTopColor', 'boxShadow'],
	'button.flat rest',
)
await check(
	'article-card',
	'article-flush',
	'article.flush',
	['borderTopWidth', 'borderRadius', 'backgroundColor'],
	'article.flush nested',
)
await check(
	'form-controls',
	'form-controls-flush',
	'form.flush',
	['margin', 'padding', 'inlineSize'],
	'form.flush',
)
await check(
	'sectioning',
	'sectioning-section',
	'section.flush',
	['margin', 'padding'],
	'section.flush',
)

await browser.close()
