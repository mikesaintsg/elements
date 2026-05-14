import { chromium } from 'playwright-core'

const browser = await chromium.launch({
	executablePath: '/opt/pw-browsers/chromium-1217/chrome-linux64/chrome',
	headless: true,
})

const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })

await page.goto('http://localhost:5173/#/use-dialog', { waitUntil: 'networkidle' })
await page.waitForTimeout(300)

// ── Test 1 — bare modal: dialog border reaches the right edge of the panel ──
await page.locator('#use-dialog-modal-vs-inline button', { hasText: 'Open modal' }).click()
await page.waitForTimeout(150)
const modal = await page.evaluate(() => {
	const dialog = document.querySelector('#use-dialog-modal-vs-inline dialog')
	if (!(dialog instanceof HTMLElement)) return { error: 'no dialog' }
	const header = dialog.querySelector('header')
	const footer = dialog.querySelector('footer')
	const cs = (el) => (el instanceof HTMLElement ? getComputedStyle(el) : null)
	const padInline = parseFloat(cs(dialog)?.paddingInline ?? '0')
	const dialogRect = dialog.getBoundingClientRect()
	const headerRect = header?.getBoundingClientRect()
	const footerRect = footer?.getBoundingClientRect()
	return {
		dialog: {
			width: dialogRect.width,
			scrollbarGutter: cs(dialog)?.scrollbarGutter,
			paddingInline: padInline,
		},
		header: headerRect
			? { left: headerRect.left, right: headerRect.right, width: headerRect.width }
			: null,
		footer: footerRect
			? { left: footerRect.left, right: footerRect.right, width: footerRect.width }
			: null,
	}
})
console.log('Bare modal dialog:')
console.log(`  width=${modal.dialog.width} scrollbarGutter=${modal.dialog.scrollbarGutter}`)
// Header/footer should span the dialog's content-box width (extended by negative
// inline margin to the dialog border). If scrollbar-gutter were still stable
// they'd be ~14px shorter than the dialog inline-size.
console.log(`  header.width=${modal.header?.width} (should be ≈ dialog.width)`)
console.log(`  footer.width=${modal.footer?.width} (should be ≈ dialog.width)`)
const headerGap = (modal.dialog.width ?? 0) - (modal.header?.width ?? 0)
const footerGap = (modal.dialog.width ?? 0) - (modal.footer?.width ?? 0)
console.log(`  → right-edge gap on header = ${headerGap.toFixed(1)}px`)
console.log(`  → right-edge gap on footer = ${footerGap.toFixed(1)}px`)
console.log(`  (both expected ≈ 0; were ~14px with scrollbar-gutter: stable)`)

await page.keyboard.press('Escape')
await page.waitForTimeout(200)

// ── Test 2 — form-wrapped dialog content is actually rendered (not empty) ──
await page.locator('button', { hasText: 'Open prompt dialog' }).click()
await page.waitForTimeout(200)
const formDialog = await page.evaluate(() => {
	const dialog = document.querySelector('#use-dialog-form dialog')
	if (!(dialog instanceof HTMLElement)) return { error: 'no dialog' }
	const form = dialog.querySelector('form')
	const header = form?.querySelector('header')
	const body = form?.querySelector('p')
	const footer = form?.querySelector('footer')
	const cs = (el) => (el instanceof HTMLElement ? getComputedStyle(el) : null)
	return {
		dialog: {
			height: dialog.getBoundingClientRect().height,
			width: dialog.getBoundingClientRect().width,
		},
		form: form
			? {
					height: form.getBoundingClientRect().height,
					flex: cs(form)?.flex,
					display: cs(form)?.display,
				}
			: null,
		header: header
			? { height: header.getBoundingClientRect().height, visible: header.offsetWidth > 0 }
			: null,
		body: body
			? { height: body.getBoundingClientRect().height, visible: body.offsetWidth > 0 }
			: null,
		footer: footer
			? { height: footer.getBoundingClientRect().height, visible: footer.offsetWidth > 0 }
			: null,
	}
})
console.log('\nForm-wrapped dialog (after open):')
console.log(JSON.stringify(formDialog, null, 2))

// ── Test 3 — hover the Cancel button. Check the footer's border-top
// stays at the same y-position before and after hover (no flicker). ──
const footerBeforeHover = await page.evaluate(() => {
	const footer = document.querySelector('#use-dialog-form dialog footer')
	if (!(footer instanceof HTMLElement)) return null
	const rect = footer.getBoundingClientRect()
	return { top: rect.top, height: rect.height }
})
await page.locator('#use-dialog-form dialog button[value="cancel"]').hover()
await page.waitForTimeout(120)
const footerAfterHover = await page.evaluate(() => {
	const footer = document.querySelector('#use-dialog-form dialog footer')
	if (!(footer instanceof HTMLElement)) return null
	const rect = footer.getBoundingClientRect()
	return { top: rect.top, height: rect.height }
})
console.log('\nFooter geometry before / after hover:')
console.log(`  before: top=${footerBeforeHover?.top} height=${footerBeforeHover?.height}`)
console.log(`  after:  top=${footerAfterHover?.top} height=${footerAfterHover?.height}`)
const dy = (footerAfterHover?.top ?? 0) - (footerBeforeHover?.top ?? 0)
console.log(
	`  → Δy = ${dy.toFixed(2)}px (expected 0; any drift means hover triggers re-layout / border-flicker)`,
)

await browser.close()
