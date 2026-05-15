// Diagnose three issues:
// 1. AnchorPage flush tile collapsed — why? block-size resolution on
//    block parent vs intended fill
// 2. Header band escaping flush-padding-zero article — what writes
//    the overflow?
// 3. Flush accordion spacing — gaps still uneven

import { chromium } from 'playwright-core'

const browser = await chromium.launch({
	executablePath: '/opt/pw-browsers/chromium-1217/chrome-linux64/chrome',
	headless: true,
})
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })

console.log('--- (1) anchor.flush tile dimensions ---')
await page.goto('http://localhost:5173/#/anchor', { waitUntil: 'networkidle' })
await page.waitForTimeout(400)
const tile = await page
	.locator('#anchor-flush article')
	.first()
	.evaluate((art) => {
		const cs = getComputedStyle(art)
		const a = art.querySelector('a.flush')
		const aCs = a ? getComputedStyle(a) : null
		return {
			artBlockSize: cs.blockSize,
			artHeight: art.offsetHeight,
			artInlineSize: art.offsetWidth,
			aBlockSize: aCs?.blockSize,
			aHeight: a?.offsetHeight,
			aDisplay: aCs?.display,
		}
	})
console.log(JSON.stringify(tile, null, 2))

console.log('\n--- (2) Article > header overflow ---')
await page.goto('http://localhost:5173/#/form-controls', { waitUntil: 'networkidle' })
await page.waitForTimeout(400)
const headerInfo = await page
	.locator('#form-controls-flat-flush-controls article > header')
	.first()
	.evaluate((h) => {
		const cs = getComputedStyle(h)
		const article = h.parentElement
		const aCs = article ? getComputedStyle(article) : null
		const aRect = article?.getBoundingClientRect()
		const hRect = h.getBoundingClientRect()
		return {
			headerInlineSize: cs.inlineSize,
			headerWidth: h.offsetWidth,
			headerMarginInline: cs.marginInline,
			headerPaddingInline: cs.paddingInline,
			articleWidth: article?.offsetWidth,
			articlePadding: aCs?.padding,
			articleOverflow: aCs?.overflow,
			hRectLeft: hRect.left,
			hRectRight: hRect.right,
			aRectLeft: aRect?.left,
			aRectRight: aRect?.right,
			headerEscapesArticle: aRect && (hRect.left < aRect.left - 1 || hRect.right > aRect.right + 1),
		}
	})
console.log(JSON.stringify(headerInfo, null, 2))

console.log('\n--- (3) details.flush sibling padding-block ---')
await page.goto('http://localhost:5173/#/details', { waitUntil: 'networkidle' })
await page.waitForTimeout(400)
const accordionGaps = await page
	.locator('#details-flush article')
	.first()
	.evaluate((art) => {
		const items = Array.from(art.querySelectorAll('details.flush'))
		return items.map((d, i) => {
			const cs = getComputedStyle(d)
			return {
				idx: i,
				paddingBlock: cs.paddingBlock,
				marginBlock: cs.marginBlock,
				borderTopWidth: cs.borderTopWidth,
				borderTopColor: cs.borderTopColor,
			}
		})
	})
console.log(JSON.stringify(accordionGaps, null, 2))

await browser.close()
