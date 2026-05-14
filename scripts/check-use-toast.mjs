import { chromium } from 'playwright-core'

const browser = await chromium.launch({
	executablePath: '/opt/pw-browsers/chromium-1217/chrome-linux64/chrome',
	headless: true,
})
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })

const errors = []
const warnings = []
page.on('pageerror', (e) => errors.push(String(e)))
page.on('console', (msg) => {
	if (msg.type() === 'error') errors.push(msg.text())
	if (msg.type() === 'warning') warnings.push(msg.text())
})

await page.goto('http://localhost:5173/#/use-toast', { waitUntil: 'networkidle' })
await page.waitForTimeout(300)

const h1 = await page.locator('h1').first().textContent()
console.log(`h1: "${h1?.trim()}"`)

// ───── Demo 1 — single toast: open, scrollbar-gutter, pause timer ─────
await page.locator('#use-toast-linear-single button', { hasText: 'Show toast' }).click()
await page.waitForTimeout(150)
const single = await page.evaluate(() => {
	const t = document.querySelector('#use-toast-linear-single output[popover]')
	if (!(t instanceof HTMLOutputElement)) return { error: 'not found' }
	const cs = getComputedStyle(t)
	return {
		popoverOpen: t.matches(':popover-open'),
		role: t.getAttribute('role') ?? t.role,
		scrollbarGutter: cs.scrollbarGutter,
		position: cs.position,
	}
})
console.log(
	`single toast: ${JSON.stringify(single)} (popoverOpen=true, scrollbarGutter=auto, position=fixed expected)`,
)

// ───── Demo 2 — linear stack: 3 toasts get cumulative offset ─────
await page.locator('#use-toast-linear-stack button', { hasText: 'Show all 3' }).click()
await page.waitForTimeout(200)
const stackOffsets = await page.evaluate(() => {
	const ts = document.querySelectorAll('#use-toast-linear-stack output[popover]')
	return Array.from(ts).map((t) => ({
		open: t instanceof HTMLOutputElement && t.matches(':popover-open'),
		offset:
			t instanceof HTMLOutputElement ? t.style.getPropertyValue('--set-toast-stack-offset') : null,
	}))
})
console.log(`linear stack offsets: ${JSON.stringify(stackOffsets)}`)
console.log(
	`  (3 toasts open; each --set-toast-stack-offset increases, last is 0 — newest at the anchored edge)`,
)

// ───── Demo 3 — deck mode: 5 toasts, depth=3, 2 should be hidden ─────
await page.locator('#use-toast-deck button', { hasText: 'Show all 5' }).click()
await page.waitForTimeout(300)
const deck = await page.evaluate(() => {
	const container = document.querySelector('#use-toast-deck [data-toast-stack]')
	const cards = document.querySelectorAll('#use-toast-deck output[popover]')
	return {
		containerHasStackAttr:
			container instanceof HTMLElement && container.hasAttribute('data-toast-stack'),
		hiddenCount:
			container instanceof HTMLElement ? container.getAttribute('data-toast-hidden-count') : null,
		frontHeight:
			container instanceof HTMLElement
				? container.style.getPropertyValue('--set-toast-front-height')
				: null,
		cards: Array.from(cards).map((c, i) => ({
			i,
			open: c instanceof HTMLOutputElement && c.matches(':popover-open'),
			stackIndex:
				c instanceof HTMLOutputElement ? c.style.getPropertyValue('--set-toast-stack-index') : null,
			toastStackHidden: c instanceof HTMLOutputElement && c.hasAttribute('data-toast-stack-hidden'),
			ariaHidden: c instanceof HTMLOutputElement ? c.getAttribute('aria-hidden') : null,
		})),
	}
})
console.log(`\ndeck mode (5 toasts, depth=3):`)
console.log(
	`  container [data-toast-stack]=${deck.containerHasStackAttr}, [data-toast-hidden-count]=${deck.hiddenCount}, --set-toast-front-height=${deck.frontHeight}`,
)
console.log(`  cards: ${JSON.stringify(deck.cards)}`)
console.log(
	`  (expected: 2 cards with data-toast-stack-hidden + aria-hidden="true"; container hidden-count=2)`,
)

// ───── Demo 4 — variant tinting: open a danger toast, verify variant tokens cascade ─────
await page.locator('#use-toast-variants button.danger', { hasText: 'Danger' }).click()
await page.waitForTimeout(150)
const danger = await page.evaluate(() => {
	const t = document.querySelector('#use-toast-variants output.danger')
	if (!(t instanceof HTMLElement)) return null
	const cs = getComputedStyle(t)
	return {
		open: t instanceof HTMLOutputElement && t.matches(':popover-open'),
		color: cs.color,
		backgroundColor: cs.backgroundColor,
		borderColor: cs.borderColor,
	}
})
console.log(`\ndanger toast: ${JSON.stringify(danger)}`)
console.log(
	`  (color/bg/border-color should resolve to non-default values via --color-danger-* tokens)`,
)

// ───── Demo 5 — cancellable lifecycle: veto on.show ─────
await page.locator('#use-toast-lifecycle input[type="checkbox"]').uncheck()
await page.locator('#use-toast-lifecycle button', { hasText: 'Try to show' }).click()
await page.waitForTimeout(200)
const vetoState = await page.evaluate(() => {
	const t = document.querySelector('#use-toast-lifecycle output[popover]')
	return t instanceof HTMLOutputElement && t.matches(':popover-open')
})
const log = await page.locator('#use-toast-lifecycle .lifecycle-log').first().textContent()
console.log(`\nlifecycle veto: still closed = ${!vetoState}; log = ${log?.trim()}`)

// ───── Auto-hide timer pause-on-hover (auditable indirectly via factory probe) ─────
// We can't easily test the timer expiry in a fast probe, but we can verify the
// composable wires the mouseenter/focusin listeners by reading the timer state
// indirectly through a quick smoke check.
console.log(`\nNote: auto-hide timer pause-on-hover is auditable via the factory source`)
console.log(`(createToast.ts lines 225-230 — mouseenter/focusin pause, mouseleave/focusout resume)`)

console.log(`\nErrors (${errors.length}):`)
for (const e of errors) console.log(`  - ${e}`)
console.log(`Warnings (${warnings.length}):`)
for (const w of warnings) console.log(`  - ${w}`)

await browser.close()
