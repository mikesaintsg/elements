// Verifies the Tier 2 + container `.flat` / `.flush` rules in the
// shipped stylesheet by injecting markup at runtime and reading
// computed styles. The framework already has docs pages for each
// element; this probe just confirms the new modifier rules paint
// what the plan describes.

import { chromium } from 'playwright-core'

const browser = await chromium.launch({
	executablePath: '/opt/pw-browsers/chromium-1217/chrome-linux64/chrome',
	headless: true,
})
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' })
await page.waitForTimeout(300)

// Inject a host with every modifier variant rendered inside.
await page.evaluate(() => {
	const host = document.createElement('div')
	host.id = 'flat-flush-probe'
	host.style.cssText =
		'position: fixed; inset-block-start: 0; inset-inline-start: 0; inline-size: 480px; padding: 24px; background: white;'
	host.innerHTML = `
		<a class="flat" href="#anchor-flat">a.flat</a>
		<a class="flush" href="#anchor-flush" id="a-flush">a.flush</a>
		<button class="flat" type="button" id="btn-flat">button.flat</button>
		<details class="flat" id="dt-flat"><summary>details.flat</summary><p>x</p></details>
		<details class="flush" id="dt-flush"><summary>details.flush</summary><p>x</p></details>
		<aside role="alert" class="flat" id="al-flat" data-alert-open><p>aside-alert.flat</p></aside>
		<aside role="alert" class="flush" id="al-flush" data-alert-open><p>aside-alert.flush</p></aside>
		<dialog class="flush" open id="dlg-flush"><p>dialog.flush non-modal</p></dialog>
		<article class="flush" id="art-flush"><header><h2>x</h2></header><p>article.flush</p></article>
		<form class="flush" id="frm-flush"><label>x<input type="text" /></label></form>
		<section class="flush" id="sec-flush"><p>section.flush</p></section>
	`
	document.body.appendChild(host)
})
await page.waitForTimeout(300)

async function read(selector, props) {
	return await page
		.locator(selector)
		.first()
		.evaluate((el, props) => {
			const cs = getComputedStyle(el)
			const out = {}
			for (const p of props) out[p] = cs[p]
			return out
		}, props)
}

console.log('--- a.flat ---')
console.log(
	'rest:',
	JSON.stringify(await read('a.flat', ['textDecorationLine', 'backgroundColor', 'borderTopColor'])),
)
await page.locator('a.flat').first().hover()
await page.waitForTimeout(150)
console.log(
	'hover:',
	JSON.stringify(await read('a.flat', ['textDecorationLine', 'backgroundColor'])),
)

console.log('\n--- a.flush ---')
console.log(
	JSON.stringify(
		await read('a.flush', [
			'display',
			'inlineSize',
			'color',
			'textDecorationLine',
			'borderRadius',
			'backgroundColor',
		]),
	),
)

console.log('\n--- button.flat ---')
console.log(
	'rest:',
	JSON.stringify(await read('button.flat', ['backgroundColor', 'borderTopColor', 'boxShadow'])),
)
await page.locator('button.flat').first().hover()
await page.waitForTimeout(150)
console.log(
	'hover:',
	JSON.stringify(await read('button.flat', ['backgroundColor', 'borderTopColor'])),
)

console.log('\n--- details.flat ---')
console.log(
	'rest:',
	JSON.stringify(await read('details.flat', ['backgroundColor', 'borderTopColor'])),
)
await page.locator('#dt-flat').evaluate((el) => (el.open = true))
await page.waitForTimeout(150)
console.log('open:', JSON.stringify(await read('#dt-flat', ['backgroundColor', 'borderTopColor'])))

console.log('\n--- details.flush ---')
console.log(
	JSON.stringify(
		await read('#dt-flush', [
			'borderTopWidth',
			'borderTopColor',
			'borderRadius',
			'backgroundColor',
			'margin',
		]),
	),
)

console.log('\n--- aside[role=alert].flat ---')
console.log(
	'rest:',
	JSON.stringify(await read('#al-flat', ['backgroundColor', 'borderInlineStartColor'])),
)
await page.locator('#al-flat').hover()
await page.waitForTimeout(150)
console.log(
	'hover:',
	JSON.stringify(await read('#al-flat', ['backgroundColor', 'borderInlineStartColor'])),
)

console.log('\n--- aside[role=alert].flush ---')
console.log(
	JSON.stringify(
		await read('#al-flush', [
			'borderRadius',
			'borderTopWidth',
			'borderBottomWidth',
			'borderInlineEndWidth',
			'borderInlineStartWidth',
		]),
	),
)

console.log('\n--- dialog.flush (non-modal) ---')
console.log(
	JSON.stringify(
		await read('#dlg-flush', [
			'borderTopWidth',
			'borderRadius',
			'boxShadow',
			'margin',
			'inlineSize',
		]),
	),
)

console.log('\n--- article.flush ---')
console.log(
	JSON.stringify(
		await read('#art-flush', [
			'borderTopWidth',
			'borderRadius',
			'boxShadow',
			'backgroundColor',
			'margin',
		]),
	),
)

console.log('\n--- form.flush ---')
console.log(JSON.stringify(await read('#frm-flush', ['margin', 'padding', 'inlineSize'])))

console.log('\n--- section.flush ---')
console.log(JSON.stringify(await read('#sec-flush', ['margin', 'padding'])))

await browser.close()
