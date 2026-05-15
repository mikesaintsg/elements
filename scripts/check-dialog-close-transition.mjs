import { chromium } from 'playwright-core'

const browser = await chromium.launch({
	executablePath: '/opt/pw-browsers/chromium-1217/chrome-linux64/chrome',
	headless: true,
})
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })

await page.goto('http://localhost:5173/#/use-dialog', { waitUntil: 'networkidle' })
await page.waitForTimeout(300)

// Open the modal, capture geometry, click Cancel, sample geometry mid-close.
await page.locator('#use-dialog-modal-vs-inline button', { hasText: 'Open modal' }).click()
await page.waitForTimeout(150)

const beforeClose = await page.evaluate(() => {
	const dialog = document.querySelector('#use-dialog-modal-vs-inline dialog')
	if (!(dialog instanceof HTMLElement)) return null
	const header = dialog.querySelector('header')
	const footer = dialog.querySelector('footer')
	const cs = (el) => (el instanceof HTMLElement ? getComputedStyle(el) : null)
	return {
		dialog: {
			display: cs(dialog)?.display,
			flexDirection: cs(dialog)?.flexDirection,
			height: dialog.getBoundingClientRect().height,
		},
		header: {
			top: header?.getBoundingClientRect().top,
			flex: cs(header)?.flex,
		},
		footer: {
			top: footer?.getBoundingClientRect().top,
			flex: cs(footer)?.flex,
		},
	}
})
console.log('Open modal — geometry before close:')
console.log(JSON.stringify(beforeClose, null, 2))

// Trigger close. The framework's transition is 250ms; sample at +50ms (during
// the discrete-display tail held by allow-discrete) and again at +200ms.
await page.locator('#use-dialog-modal-vs-inline dialog button.subtle').click()

await page.waitForTimeout(50)
const at50ms = await page.evaluate(() => {
	const dialog = document.querySelector('#use-dialog-modal-vs-inline dialog')
	if (!(dialog instanceof HTMLElement)) return null
	const header = dialog.querySelector('header')
	const footer = dialog.querySelector('footer')
	const cs = (el) => (el instanceof HTMLElement ? getComputedStyle(el) : null)
	return {
		dialog: {
			display: cs(dialog)?.display,
			flexDirection: cs(dialog)?.flexDirection,
			height: dialog.getBoundingClientRect().height,
			open: dialog.hasAttribute('open'),
		},
		header: {
			top: header?.getBoundingClientRect().top,
			flex: cs(header)?.flex,
		},
		footer: {
			top: footer?.getBoundingClientRect().top,
			flex: cs(footer)?.flex,
		},
	}
})
console.log('\n+50ms after close (mid-transition; should retain flex-column + child pin):')
console.log(JSON.stringify(at50ms, null, 2))

// Verify the chrome stayed put through the transition tail.
const dropY = (beforeClose?.footer.top ?? 0) - (at50ms?.footer.top ?? 0)
console.log(
	`\nFooter.top before vs +50ms: Δ = ${dropY.toFixed(2)}px (expected ~0; >5 means the dialog re-flowed mid-close → "collapse onto itself")`,
)

await page.waitForTimeout(400)
const after = await page.evaluate(() => {
	const dialog = document.querySelector('#use-dialog-modal-vs-inline dialog')
	if (!(dialog instanceof HTMLElement)) return null
	return { display: getComputedStyle(dialog).display, open: dialog.hasAttribute('open') }
})
console.log(`\nAfter full close: ${JSON.stringify(after)} (expected display=none, open=false)`)

await browser.close()
