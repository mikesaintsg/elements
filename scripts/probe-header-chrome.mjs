// Probe framework's auto-banded chrome for <article> > <header> and
// <article> > <footer>. We want to know: when an article has
// --set-article-padding-{inline,block}: 0 (the flush composition
// host pattern), does the framework's header / footer chrome
// already supply its own internal padding? If yes, the demos
// shouldn't need `<header style="padding-inline: 1rem; padding-block:
// 0.75rem">` overrides — the framework should already paint that
// chrome and any inline override is BLEED of framework logic into
// app pages.

import { chromium } from 'playwright-core'

const browser = await chromium.launch({
	executablePath: '/opt/pw-browsers/chromium-1217/chrome-linux64/chrome',
	headless: true,
})
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })

// Test 1: Default article > header chrome (no token override).
await page.goto('http://localhost:5173/#/article-card', { waitUntil: 'networkidle' })
await page.waitForTimeout(400)
const bareHeader = await page
	.locator('#article-slots article > header')
	.first()
	.evaluate((h) => {
		const cs = getComputedStyle(h)
		return {
			paddingInline: cs.paddingInline,
			paddingBlock: cs.paddingBlock,
			marginInline: cs.marginInline,
			backgroundColor: cs.backgroundColor,
			borderBottomWidth: cs.borderBottomWidth,
		}
	})
console.log('Default article > header chrome:', JSON.stringify(bareHeader, null, 2))

// Test 2: Inject an article with all tokens zeroed + no inline overrides on header.
const injected = await page.evaluate(() => {
	const wrap = document.createElement('div')
	wrap.style.cssText =
		'position: fixed; inset-block-start: 0; inset-inline-start: 0; inline-size: 400px; padding: 24px; background: white;'
	wrap.innerHTML = `
		<article style="--set-article-padding-inline: 0; --set-article-padding-block: 0; --set-article-gap: 0; overflow: clip">
			<header><h3>Bare header</h3></header>
			<p>body content</p>
			<footer><small>footer text</small></footer>
		</article>
	`
	document.body.appendChild(wrap)
	const a = wrap.querySelector('article')
	const h = wrap.querySelector('header')
	const f = wrap.querySelector('footer')
	const ahs = getComputedStyle(a)
	const hs = getComputedStyle(h)
	const fs = getComputedStyle(f)
	return {
		articleDisplay: ahs.display,
		articleGap: ahs.gap,
		articlePadding: ahs.padding,
		headerPaddingInline: hs.paddingInline,
		headerPaddingBlock: hs.paddingBlock,
		headerMarginInline: hs.marginInline,
		headerBg: hs.backgroundColor,
		footerPaddingInline: fs.paddingInline,
		footerPaddingBlock: fs.paddingBlock,
		footerMarginInline: fs.marginInline,
	}
})
console.log('Token-zeroed article (no inline header style):', JSON.stringify(injected, null, 2))

await browser.close()
