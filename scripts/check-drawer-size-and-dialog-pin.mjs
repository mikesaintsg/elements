import { chromium } from 'playwright-core'

const browser = await chromium.launch({
	executablePath: '/opt/pw-browsers/chromium-1217/chrome-linux64/chrome',
	headless: true,
})

// Use a mobile-ish viewport so 50dvh = ~356px (visibly large enough).
const page = await browser.newPage({ viewport: { width: 390, height: 712 } })

// ── Verify drawer block-size bump: top drawer should now be ~50dvh ──
await page.goto('http://localhost:5173/#/use-aside', { waitUntil: 'networkidle' })
await page.waitForTimeout(300)

await page.locator('#use-aside-edges button', { hasText: 'Open top' }).click()
await page.waitForTimeout(150)
const drawerSize = await page.evaluate(() => {
	const aside = document.querySelector('#use-aside-edges aside.top')
	if (!(aside instanceof HTMLElement)) return { error: 'no aside' }
	const r = aside.getBoundingClientRect()
	return {
		height: r.height,
		viewportHeight: window.innerHeight,
		blockSizeToken: getComputedStyle(document.documentElement)
			.getPropertyValue('--set-aside-drawer-block-size')
			.trim(),
		ratio: (r.height / window.innerHeight).toFixed(2),
	}
})
console.log(
	`Top drawer: height=${drawerSize.height}px viewport=${drawerSize.viewportHeight}px ratio=${drawerSize.ratio} token=${drawerSize.blockSizeToken}`,
)
console.log(`  (expected ratio ≈ 0.50; token = 50dvh)`)

// Close drawer.
await page.keyboard.press('Escape')
await page.waitForTimeout(200)

// ── Verify bare-dialog pin: open modal dialog with header + p + footer ──
await page.goto('http://localhost:5173/#/use-dialog', { waitUntil: 'networkidle' })
await page.waitForTimeout(300)

// Inject a tall dialog into the page so we can verify scroll-through-middle
// while header + footer pin.
await page.evaluate(() => {
	const dialog = document.createElement('dialog')
	dialog.id = 'probe-dialog'
	dialog.innerHTML = `
    <header><h3>Probe dialog</h3></header>
    <div>${'<p>line</p>'.repeat(60)}</div>
    <footer><button type="button" id="probe-close">Close</button></footer>
  `
	document.body.appendChild(dialog)
	dialog.showModal()
})
await page.waitForTimeout(200)

const probeDialog = await page.evaluate(() => {
	const d = document.querySelector('#probe-dialog')
	if (!(d instanceof HTMLElement)) return { error: 'no dialog' }
	const header = d.querySelector('header')
	const body = d.querySelector('div')
	const footer = d.querySelector('footer')
	const cs = (el) => (el instanceof HTMLElement ? getComputedStyle(el) : null)
	return {
		dialog: {
			display: cs(d)?.display,
			overflow: cs(d)?.overflow,
			height: d.getBoundingClientRect().height,
			maxBlock: cs(d)?.maxBlockSize,
		},
		header: {
			flex: cs(header)?.flex ?? null,
			offsetTop: header?.offsetTop ?? null,
		},
		body: {
			flex: cs(body)?.flex ?? null,
			overflowY: cs(body)?.overflowY ?? null,
			scrollHeight: body?.scrollHeight ?? null,
			clientHeight: body?.clientHeight ?? null,
		},
		footer: {
			flex: cs(footer)?.flex ?? null,
			offsetTop: footer?.offsetTop ?? null,
		},
	}
})
console.log('\nBare dialog with overflowing content:')
console.log(JSON.stringify(probeDialog, null, 2))

// Try scrolling the body. Footer offsetTop should stay constant — pinned.
const footerBeforeScroll = probeDialog.footer.offsetTop
const afterScroll = await page.evaluate(() => {
	const d = document.querySelector('#probe-dialog')
	const body = d?.querySelector('div')
	if (!(body instanceof HTMLElement)) return null
	body.scrollTop = 200
	const footer = d?.querySelector('footer')
	return {
		bodyScrollTop: body.scrollTop,
		footerOffsetTop: footer instanceof HTMLElement ? footer.offsetTop : null,
	}
})
console.log(
	`After body.scrollTop = 200: bodyScrollTop=${afterScroll?.bodyScrollTop} footerOffsetTop=${afterScroll?.footerOffsetTop} (was ${footerBeforeScroll}; should be unchanged because footer is pinned)`,
)

await browser.close()
