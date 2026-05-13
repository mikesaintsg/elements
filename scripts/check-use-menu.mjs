import { chromium } from 'playwright-core'

const browser = await chromium.launch({
	executablePath: '/opt/pw-browsers/chromium-1217/chrome-linux64/chrome',
	headless: true,
})
const page = await browser.newPage()

const errors = []
const warnings = []
page.on('pageerror', (e) => errors.push(String(e)))
page.on('console', (msg) => {
	if (msg.type() === 'error') errors.push(msg.text())
	if (msg.type() === 'warning') warnings.push(msg.text())
})

await page.goto('http://localhost:5173/#/use-menu', { waitUntil: 'networkidle' })
await page.waitForTimeout(300)

// 1. The page rendered.
const h1 = await page.locator('h1').first().textContent()
console.log(`h1: "${h1?.trim()}"`)

// 2. The default toggle exposes aria-expanded=false + aria-haspopup=menu BEFORE open.
const defaultToggle = page.locator('#use-menu-default .dropdown-stage button.dropdown')
console.log(
	`Default toggle pre-open: aria-expanded=${await defaultToggle.getAttribute('aria-expanded')} aria-haspopup=${await defaultToggle.getAttribute('aria-haspopup')}`,
)

// 3. Clicking opens the panel. aria-expanded flips to true.
await defaultToggle.click()
await page.waitForTimeout(120)
console.log(
	`Default toggle post-open: aria-expanded=${await defaultToggle.getAttribute('aria-expanded')}`,
)

// 4. Pressing ArrowDown moves focus through items.
await page.keyboard.press('ArrowDown')
await page.waitForTimeout(50)
const focused1 = await page.evaluate(() => document.activeElement?.textContent?.trim() ?? null)
console.log(`After 1× ArrowDown post-rove: focused="${focused1}"`)
await page.keyboard.press('ArrowDown')
await page.waitForTimeout(50)
const focused2 = await page.evaluate(() => document.activeElement?.textContent?.trim() ?? null)
console.log(`After 2× ArrowDown: focused="${focused2}"`)

// 5. Pressing End jumps to last.
await page.keyboard.press('End')
await page.waitForTimeout(50)
const focusedEnd = await page.evaluate(() => document.activeElement?.textContent?.trim() ?? null)
console.log(`After End: focused="${focusedEnd}"`)

// 6. Click an item — panel auto-dismisses + "Last picked" updates.
// (Toggle is currently open from step 3; no need to re-toggle.)
await page.locator('#use-menu-default menu[popover] button', { hasText: 'Profile' }).click()
await page.waitForTimeout(120)
const lastPicked = await page.locator('#use-menu-default > small').first().textContent()
const isClosed = (await defaultToggle.getAttribute('aria-expanded')) === 'false'
console.log(`After item click: closed=${isClosed} lastPicked="${lastPicked?.trim()}"`)

// 7. Sticky panel — clicking the item should NOT dismiss (dismiss.inside=false).
const stickyToggle = page.locator('#use-menu-dismiss button', { hasText: 'Sticky' })
await stickyToggle.click()
await page.waitForTimeout(120)
const stickyOpen = (await stickyToggle.getAttribute('aria-expanded')) === 'true'
console.log(`Sticky pre-click-outside: open=${stickyOpen}`)
// Click outside (on the heading).
await page.locator('h1').click()
await page.waitForTimeout(120)
const stickyStillOpen = (await stickyToggle.getAttribute('aria-expanded')) === 'true'
console.log(`Sticky after outside-click: still open=${stickyStillOpen} (expected true)`)
// Press Escape — should also be ignored.
await page.keyboard.press('Escape')
await page.waitForTimeout(120)
const stickyAfterEsc = (await stickyToggle.getAttribute('aria-expanded')) === 'true'
console.log(`Sticky after Escape: still open=${stickyAfterEsc} (expected true)`)
// Only the toggle closes it.
await stickyToggle.click()
await page.waitForTimeout(120)
const stickyClosed = (await stickyToggle.getAttribute('aria-expanded')) === 'false'
console.log(`Sticky after toggle click: closed=${stickyClosed}`)

// 8. Lifecycle veto — uncheck "allow show" then try to open; the panel should not open.
const allowCheckbox = page.locator('#use-menu-lifecycle input[type="checkbox"]')
await allowCheckbox.uncheck()
const lifecycleToggle = page.locator('#use-menu-lifecycle button.dropdown')
await lifecycleToggle.click()
await page.waitForTimeout(120)
const vetoed = (await lifecycleToggle.getAttribute('aria-expanded')) === 'false'
const log = await page.locator('#use-menu-lifecycle > small').first().textContent()
console.log(`After veto attempt: aria-expanded=false?=${vetoed} log=${log?.trim()}`)

// Errors / warnings.
console.log(`\nErrors (${errors.length}):`)
for (const e of errors) console.log(`  - ${e}`)
console.log(`Warnings (${warnings.length}):`)
for (const w of warnings) console.log(`  - ${w}`)

await browser.close()
