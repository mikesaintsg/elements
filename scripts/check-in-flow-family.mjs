import { chromium } from 'playwright-core'

const browser = await chromium.launch({
	executablePath: '/opt/pw-browsers/chromium-1217/chrome-linux64/chrome',
	headless: true,
})
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })

await page.goto('http://localhost:5173/#/aside', { waitUntil: 'networkidle' })
await page.waitForTimeout(300)

// ── Probe 1 — aside[role="alert"]: scrollbar-gutter + Y-slide on closed state ──
const alertState = await page.evaluate(() => {
	const alerts = document.querySelectorAll('aside[role="alert"]')
	const sample = []
	for (const el of alerts) {
		if (!(el instanceof HTMLElement)) continue
		const cs = getComputedStyle(el)
		sample.push({
			text: el.textContent?.trim().slice(0, 60),
			role: el.getAttribute('role'),
			isOpen: el.hasAttribute('data-alert-open'),
			scrollbarGutter: cs.scrollbarGutter,
			transform: cs.transform,
			opacity: cs.opacity,
		})
		if (sample.length >= 4) break
	}
	return sample
})
console.log('aside[role="alert"] sample on AsidePage:')
console.log(JSON.stringify(alertState, null, 2))

// ── Probe 2 — non-modal dialog: scrollbar-gutter=auto, @starting-style Y-slide ──
await page.goto('http://localhost:5173/#/use-dialog', { waitUntil: 'networkidle' })
await page.waitForTimeout(300)

// Open the non-modal (inline) dialog and capture computed style.
await page.locator('#use-dialog-modal-vs-inline button', { hasText: 'Open non-modal' }).click()
await page.waitForTimeout(180)
const dialogState = await page.evaluate(() => {
	const dialog = document.querySelector('#use-dialog-modal-vs-inline dialog[open]')
	if (!(dialog instanceof HTMLElement)) return { error: 'no open dialog' }
	const cs = getComputedStyle(dialog)
	return {
		open: dialog.hasAttribute('open'),
		isModal: dialog.matches(':modal'),
		scrollbarGutter: cs.scrollbarGutter,
		transform: cs.transform,
		opacity: cs.opacity,
		transition: cs.transition.includes('transform')
			? 'transform in transition list ✓'
			: 'transform NOT in transition list',
	}
})
console.log('\nNon-modal dialog (in-flow, .show() path):')
console.log(JSON.stringify(dialogState, null, 2))

await page.close()
await browser.close()
