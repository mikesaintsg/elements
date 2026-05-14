import { chromium } from 'playwright-core'

const browser = await chromium.launch({
	executablePath: '/opt/pw-browsers/chromium-1217/chrome-linux64/chrome',
	headless: true,
})

// Desktop-sized viewport so the universal scrollbar-gutter actually
// applies (the framework writes it on every element).
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })

await page.goto('http://localhost:5173/#/use-aside', { waitUntil: 'networkidle' })
await page.waitForTimeout(300)

// Open the top drawer — it has `inline-size: 100dvw` so it should reach
// both edges of the viewport.
await page.locator('#use-aside-edges button', { hasText: 'Open top' }).click()
await page.waitForTimeout(200)

const measurements = await page.evaluate(() => {
	const aside = document.querySelector('#use-aside-edges aside.top')
	if (!(aside instanceof HTMLElement)) return { error: 'no aside' }
	const middle = aside.querySelector('p')
	const cs = (el) => (el instanceof HTMLElement ? getComputedStyle(el) : null)
	return {
		viewport: { width: window.innerWidth, height: window.innerHeight },
		drawer: {
			rect: aside.getBoundingClientRect(),
			scrollbarGutter: cs(aside)?.scrollbarGutter,
			overflow: cs(aside)?.overflow,
		},
		middle: {
			rect: middle?.getBoundingClientRect(),
			scrollbarGutter: cs(middle)?.scrollbarGutter,
			overflowY: cs(middle)?.overflowY,
		},
	}
})

const v = measurements.viewport.width
const d = measurements.drawer.rect
const m = measurements.middle.rect
const drawerRightGap = v - d.right
const middleRightGap = v - m.right

console.log(`Viewport width: ${v}px`)
console.log(`Drawer rect: left=${d.left} right=${d.right} width=${d.width}`)
console.log(
	`  → right-edge gap = ${drawerRightGap}px (expected 0; was ~14px with scrollbar-gutter: stable)`,
)
console.log(`  → scrollbar-gutter = ${measurements.drawer.scrollbarGutter}`)
console.log(`  → overflow         = ${measurements.drawer.overflow}`)
console.log(`Middle <p> rect: left=${m?.left} right=${m?.right} width=${m?.width}`)
console.log(`  → right-edge gap inside drawer = ${middleRightGap}px`)
console.log(`  → scrollbar-gutter = ${measurements.middle.scrollbarGutter}`)
console.log(`  → overflow-y       = ${measurements.middle.overflowY}`)

await browser.close()
