import { chromium } from 'playwright-core'

const browser = await chromium.launch({
	executablePath: '/opt/pw-browsers/chromium-1217/chrome-linux64/chrome',
	headless: true,
})
const page = await browser.newPage()
await page.goto('http://localhost:5173/#/use-table', { waitUntil: 'networkidle' })
await page.waitForTimeout(500)

// Check the handle's bounding box
const handleBox = await page
	.locator('#use-table-resize th:nth-child(1) [data-table-resize-handle]')
	.boundingBox()
console.log('Handle 1 bounding box:', handleBox)

const initialWidth = await page
	.locator('#use-table-resize th:nth-child(1)')
	.evaluate((th) => th.offsetWidth)
console.log('Initial width:', initialWidth)

// Drag the handle via dispatchEvent
await page
	.locator('#use-table-resize th:nth-child(1) [data-table-resize-handle]')
	.evaluate(async (handle) => {
		const rect = handle.getBoundingClientRect()
		const cx = rect.left + rect.width / 2
		const cy = rect.top + rect.height / 2
		const dispatch = (type, x, y) => {
			const ev = new PointerEvent(type, {
				bubbles: true,
				cancelable: true,
				pointerId: 1,
				pointerType: 'mouse',
				button: 0,
				clientX: x,
				clientY: y,
				buttons: type === 'pointerup' ? 0 : 1,
			})
			handle.dispatchEvent(ev)
		}
		dispatch('pointerdown', cx, cy)
		await new Promise((r) => setTimeout(r, 20))
		dispatch('pointermove', cx + 60, cy)
		await new Promise((r) => setTimeout(r, 20))
		dispatch('pointerup', cx + 60, cy)
	})
await page.waitForTimeout(300)
const afterWidth = await page
	.locator('#use-table-resize th:nth-child(1)')
	.evaluate((th) => th.offsetWidth)
console.log('After drag width:', afterWidth)
console.log('Delta:', afterWidth - initialWidth)

await browser.close()
