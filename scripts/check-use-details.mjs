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

await page.goto('http://localhost:5173/#/use-details', { waitUntil: 'networkidle' })
await page.waitForTimeout(300)

const h1 = await page.locator('h1').first().textContent()
console.log(`h1: "${h1?.trim()}"`)

// 1. Programmatic panel: opens on mount via initial: true.
const initialOpen = await page.evaluate(() => {
	const d = document.querySelector('#use-details-programmatic > details')
	return d instanceof HTMLDetailsElement ? d.open : null
})
console.log(`initial: true → details.open = ${initialOpen} (expected true)`)

// 2. Programmatic close: click the Close button.
await page.locator('#use-details-programmatic button', { hasText: 'Close' }).click()
await page.waitForTimeout(80)
const afterClose = await page.evaluate(() => {
	const d = document.querySelector('#use-details-programmatic > details')
	return d instanceof HTMLDetailsElement ? d.open : null
})
console.log(`after Close click: details.open = ${afterClose} (expected false)`)

// 3. External flip: simulate `details.open = true` directly. The visible ref
// should re-sync via the native toggle event.
await page.evaluate(() => {
	const d = document.querySelector('#use-details-programmatic > details')
	if (d instanceof HTMLDetailsElement) d.open = true
})
await page.waitForTimeout(80)
const stateLine = await page.locator('#use-details-intro aside p').first().textContent()
console.log(`after external flip — state line includes 'programmatic open'?`)
console.log(`  ${stateLine?.trim().slice(0, 120)}`)

// 4. Accordion: A is initially open, B and C closed. Click B's summary;
// A should auto-close, B opens.
const accBefore = await page.evaluate(() => {
	const ds = document.querySelectorAll('#use-details-accordion details')
	return Array.from(ds).map((d, i) => ({
		section: ['A', 'B', 'C'][i],
		open: d instanceof HTMLDetailsElement ? d.open : null,
	}))
})
console.log(`accordion before click: ${JSON.stringify(accBefore)}`)

await page.locator('#use-details-accordion details:nth-of-type(2) > summary').click()
await page.waitForTimeout(150)
const accAfter = await page.evaluate(() => {
	const ds = document.querySelectorAll('#use-details-accordion details')
	return Array.from(ds).map((d, i) => ({
		section: ['A', 'B', 'C'][i],
		open: d instanceof HTMLDetailsElement ? d.open : null,
	}))
})
console.log(
	`accordion after clicking B: ${JSON.stringify(accAfter)} (expected A:false, B:true, C:false)`,
)

// 5. Lifecycle veto: uncheck 'allow show', click summary on the lifecycle panel.
await page.locator('#use-details-lifecycle input[type="checkbox"]').first().uncheck()
await page.locator('#use-details-lifecycle > details > summary').click()
await page.waitForTimeout(80)
const vetoState = await page.evaluate(() => {
	const d = document.querySelector('#use-details-lifecycle > details')
	return d instanceof HTMLDetailsElement ? d.open : null
})
const log = await page.locator('#use-details-lifecycle > small').first().textContent()
console.log(`after veto attempt — details.open = ${vetoState} (expected false)`)
console.log(`  log: ${log?.trim()}`)

console.log(`\nErrors (${errors.length}):`)
for (const e of errors) console.log(`  - ${e}`)
console.log(`Warnings (${warnings.length}):`)
for (const w of warnings) console.log(`  - ${w}`)

await browser.close()
