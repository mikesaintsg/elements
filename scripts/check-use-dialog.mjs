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

await page.goto('http://localhost:5173/#/use-dialog', { waitUntil: 'networkidle' })
await page.waitForTimeout(300)

// 1. Page rendered.
const h1 = await page.locator('h1').first().textContent()
console.log(`h1: "${h1?.trim()}"`)

// 2. Modal: open, native ::backdrop present, Escape closes by default.
await page.locator('#use-dialog-modal-vs-inline button.primary', { hasText: 'Open modal' }).click()
await page.waitForTimeout(120)
const modalOpen = await page.locator('dialog[open]').count()
console.log(`After 'Open modal': dialog[open] count = ${modalOpen}`)
await page.keyboard.press('Escape')
await page.waitForTimeout(120)
const modalClosed = (await page.locator('dialog[open]').count()) === 0
console.log(`After Escape: all closed = ${modalClosed}`)

// 3. Inline (non-modal): open + close via button.
await page.locator('#use-dialog-modal-vs-inline button', { hasText: 'Open non-modal' }).click()
await page.waitForTimeout(120)
const inlineOpen = await page.locator('#use-dialog-modal-vs-inline dialog[open]').count()
console.log(`Non-modal open: ${inlineOpen}`)
// Non-modal Escape: dialog doesn't natively support Escape; useDialog only
// bridges the cancel event for modal. So we close via button.
await page.locator('#use-dialog-modal-vs-inline dialog[open] button.primary').click()
await page.waitForTimeout(120)
const inlineClosed = (await page.locator('#use-dialog-modal-vs-inline dialog[open]').count()) === 0
console.log(`Non-modal after Close: closed = ${inlineClosed}`)

// 4. Static dialog: Escape suppressed, only buttons close.
await page.locator('button.warning', { hasText: 'Open static dialog' }).click()
await page.waitForTimeout(150)
const staticOpen = await page.locator('#use-dialog-dismiss dialog[open]').count()
console.log(`Static dialog opened: ${staticOpen}`)
await page.keyboard.press('Escape')
await page.waitForTimeout(150)
const stillOpenAfterEsc = await page.locator('#use-dialog-dismiss dialog[open]').count()
console.log(`Static after Escape: open = ${stillOpenAfterEsc} (expected 1)`)
await page.locator('#use-dialog-dismiss dialog[open] button.danger').click()
await page.waitForTimeout(150)
const staticClosed = (await page.locator('#use-dialog-dismiss dialog[open]').count()) === 0
console.log(`Static after button: closed = ${staticClosed}`)

// 5. Form dialog: submit captures returnValue.
await page.locator('button', { hasText: 'Open prompt dialog' }).click()
await page.waitForTimeout(150)
await page.locator('#use-dialog-form dialog button[value="save"]').click()
await page.waitForTimeout(150)
const returnText = await page.locator('#use-dialog-form > small').first().textContent()
console.log(`Form return: ${returnText?.trim()}`)

// 6. Lifecycle veto: uncheck "allow show", click the open button.
const allowShow = page.locator('#use-dialog-lifecycle input').nth(0)
await allowShow.uncheck()
await page.locator('button', { hasText: 'Try to open' }).click()
await page.waitForTimeout(150)
const vetoedClosed = (await page.locator('#use-dialog-lifecycle dialog[open]').count()) === 0
const log = await page.locator('#use-dialog-lifecycle > small').first().textContent()
console.log(`After veto: still closed = ${vetoedClosed} log = ${log?.trim()}`)

console.log(`\nErrors (${errors.length}):`)
for (const e of errors) console.log(`  - ${e}`)
console.log(`Warnings (${warnings.length}):`)
for (const w of warnings) console.log(`  - ${w}`)

await browser.close()
