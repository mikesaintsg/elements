import { chromium } from 'playwright-core'

const browser = await chromium.launch({
	executablePath: '/opt/pw-browsers/chromium-1217/chrome-linux64/chrome',
	headless: true,
})
const page = await browser.newPage({ viewport: { width: 800, height: 600 } })

// Use a long page so there's actually something to scroll.
await page.goto('http://localhost:5173/#/use-dialog', { waitUntil: 'networkidle' })
await page.waitForTimeout(300)

// Pre-dialog scroll position should be 0.
const beforeOpen = await page.evaluate(() => window.scrollY)

// Scroll the page down before opening the dialog.
await page.evaluate(() => window.scrollTo(0, 1500))
await page.waitForTimeout(50)
const afterScroll = await page.evaluate(() => window.scrollY)
console.log(`After scrollTo(0, 1500): window.scrollY = ${afterScroll}`)

// Open the non-modal dialog with scroll.lock = true.
await page.locator('button.secondary', { hasText: 'Open non-modal with scroll lock' }).click()
await page.waitForTimeout(150)

const lockApplied = await page.evaluate(() => ({
	hasLockAttr: document.body.hasAttribute('data-elements-scroll-locked'),
	overflow: getComputedStyle(document.body).overflow,
}))
console.log(`After open: lockAttr=${lockApplied.hasLockAttr} body.overflow=${lockApplied.overflow}`)

// Try to scroll while the dialog is open. body[data-elements-scroll-locked]
// { overflow: hidden } should pin the viewport — scrollTo should not move.
const tryScrollWhileLocked = await page.evaluate(() => {
	const before = window.scrollY
	window.scrollTo(0, 0)
	return { before, after: window.scrollY }
})
console.log(
	`While open: tried scrollTo(0,0). before=${tryScrollWhileLocked.before} after=${tryScrollWhileLocked.after} (expected unchanged or pinned)`,
)

// Close the dialog — lock should clear.
await page.locator('#use-dialog-scroll-lock dialog button.primary').click()
await page.waitForTimeout(200)
const afterClose = await page.evaluate(() => ({
	hasLockAttr: document.body.hasAttribute('data-elements-scroll-locked'),
	overflow: getComputedStyle(document.body).overflow,
}))
console.log(`After close: lockAttr=${afterClose.hasLockAttr} body.overflow=${afterClose.overflow}`)

await browser.close()
void beforeOpen
