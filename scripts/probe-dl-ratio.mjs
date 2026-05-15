import { chromium } from 'playwright-core'

const browser = await chromium.launch({
	executablePath: '/opt/pw-browsers/chromium-1217/chrome-linux64/chrome',
	headless: true,
})

async function probeAt(width, height, label) {
	const page = await browser.newPage({ viewport: { width, height } })
	await page.goto('http://localhost:5173/#/use-table', { waitUntil: 'networkidle' })
	await page.waitForTimeout(400)
	// Scroll to API ref
	await page.locator('#use-table-api').scrollIntoViewIfNeeded()
	await page.waitForTimeout(200)
	const dims = await page
		.locator('#use-table-api dl')
		.first()
		.evaluate((dl) => {
			const cs = getComputedStyle(dl)
			const dt = dl.querySelector('dt')
			const dd = dl.querySelector('dd')
			return {
				gridTemplateColumns: cs.gridTemplateColumns,
				dtWidth: dt?.offsetWidth,
				ddWidth: dd?.offsetWidth,
				dlWidth: dl.offsetWidth,
				ratio: dt && dd ? (dd.offsetWidth / dt.offsetWidth).toFixed(2) : null,
			}
		})
	console.log(`[${label} ${width}×${height}]`, JSON.stringify(dims))
	await page.close()
}

await probeAt(1280, 800, 'desktop')
await probeAt(1024, 768, 'tablet')
await probeAt(768, 1024, 'tablet-portrait')
await probeAt(640, 800, 'wide-edge')
await probeAt(375, 800, 'mobile')

await browser.close()
