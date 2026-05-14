import { chromium } from 'playwright-core'

const browser = await chromium.launch({
	executablePath: '/opt/pw-browsers/chromium-1217/chrome-linux64/chrome',
	headless: true,
})

// ── Issue 1: top/bottom drawer body scrolls; header + footer stay pinned ──
{
	const page = await browser.newPage({ viewport: { width: 390, height: 712 } })
	await page.goto('http://localhost:5173/#/use-aside', { waitUntil: 'networkidle' })
	await page.waitForTimeout(300)

	// Open the top drawer.
	await page.locator('#use-aside-edges button', { hasText: 'Open top' }).click()
	await page.waitForTimeout(200)

	const topGeom = await page.evaluate(() => {
		const aside = document.querySelector('#use-aside-edges aside.top')
		if (!(aside instanceof HTMLElement)) return { error: 'no aside' }
		const header = aside.querySelector('header')
		const footer = aside.querySelector('footer')
		const middle = aside.querySelector('p')
		const cs = (el) => (el instanceof HTMLElement ? getComputedStyle(el) : null)
		return {
			drawer: { overflowY: cs(aside)?.overflowY, height: aside.getBoundingClientRect().height },
			header: {
				flex: cs(header)?.flex ?? null,
				present: !!header,
				offsetTop: header?.offsetTop ?? null,
			},
			middle: {
				flex: cs(middle)?.flex ?? null,
				overflowY: cs(middle)?.overflowY ?? null,
				present: !!middle,
			},
			footer: {
				flex: cs(footer)?.flex ?? null,
				present: !!footer,
				offsetTop: footer?.offsetTop ?? null,
			},
		}
	})
	console.log('Top drawer geometry (mobile 390×712):')
	console.log(JSON.stringify(topGeom, null, 2))

	await page.close()
}

// ── Issue 2: non-modal dialog scroll lock pins page AND <main> on mobile ──
{
	const page = await browser.newPage({ viewport: { width: 390, height: 712 } })
	await page.goto('http://localhost:5173/#/use-dialog', { waitUntil: 'networkidle' })
	await page.waitForTimeout(300)

	// Identify the actual scroll container in the showcase shell.
	const before = await page.evaluate(() => {
		const main = document.querySelector('main')
		const body = document.body
		return {
			body: { overflowY: getComputedStyle(body).overflowY },
			main:
				main instanceof HTMLElement
					? {
							overflowY: getComputedStyle(main).overflowY,
							scrollTop: main.scrollTop,
							scrollHeight: main.scrollHeight,
							clientHeight: main.clientHeight,
						}
					: null,
		}
	})
	console.log('\nBefore opening non-modal scroll-lock dialog:')
	console.log(JSON.stringify(before, null, 2))

	// Open the non-modal scroll-lock dialog.
	await page.locator('button.secondary', { hasText: 'Open non-modal with scroll lock' }).click()
	await page.waitForTimeout(200)

	const after = await page.evaluate(() => {
		const main = document.querySelector('main')
		const body = document.body
		return {
			body: {
				hasLockAttr: body.hasAttribute('data-elements-scroll-locked'),
				overflowY: getComputedStyle(body).overflowY,
				overscrollBehavior: getComputedStyle(body).overscrollBehavior,
				touchAction: getComputedStyle(body).touchAction,
			},
			main:
				main instanceof HTMLElement
					? {
							overflowY: getComputedStyle(main).overflowY,
							overscrollBehavior: getComputedStyle(main).overscrollBehavior,
							touchAction: getComputedStyle(main).touchAction,
						}
					: null,
		}
	})
	console.log('\nAfter opening non-modal scroll-lock dialog:')
	console.log(JSON.stringify(after, null, 2))

	// Try to scroll <main> programmatically. With overflow: hidden it shouldn't move.
	const scrollAttempt = await page.evaluate(() => {
		const main = document.querySelector('main')
		if (!(main instanceof HTMLElement)) return { error: 'no main' }
		const beforeTop = main.scrollTop
		main.scrollTo(0, 200)
		const afterTop = main.scrollTop
		return { beforeTop, afterTop }
	})
	console.log(
		`Tried main.scrollTo(0, 200) while locked. before=${scrollAttempt.beforeTop} after=${scrollAttempt.afterTop} (expected both 0 — overflow:hidden blocks programmatic scroll)`,
	)

	// Close the dialog and confirm scroll-lock attribute clears.
	await page.locator('#use-dialog-scroll-lock dialog button.primary').click()
	await page.waitForTimeout(300)
	const cleanup = await page.evaluate(() => ({
		hasLockAttr: document.body.hasAttribute('data-elements-scroll-locked'),
		mainOverflow: getComputedStyle(document.querySelector('main') ?? document.body).overflowY,
	}))
	console.log(`\nAfter close: ${JSON.stringify(cleanup)}`)

	await page.close()
}

await browser.close()
