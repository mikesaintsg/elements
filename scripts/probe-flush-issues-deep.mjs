// Deep diagnostic of remaining flush issues:
// 1. Article gap appearing between flush children (accordion gap)
// 2. Input vertical alignment in flush grid rows
// 3. Article display type + gap value

import { chromium } from 'playwright-core'

const browser = await chromium.launch({
	executablePath: '/opt/pw-browsers/chromium-1217/chrome-linux64/chrome',
	headless: true,
})
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })

console.log('--- (1) Article hosting flush details — display + gap ---')
await page.goto('http://localhost:5173/#/details', { waitUntil: 'networkidle' })
await page.waitForTimeout(500)
const detailsHost = await page
	.locator('#details-flush article')
	.first()
	.evaluate((art) => {
		const cs = getComputedStyle(art)
		const children = Array.from(art.children)
		const rects = children.map((c) => c.getBoundingClientRect())
		const gaps = []
		for (let i = 1; i < rects.length; i++) {
			gaps.push(rects[i].top - rects[i - 1].bottom)
		}
		return {
			display: cs.display,
			flexDirection: cs.flexDirection,
			gap: cs.gap,
			rowGap: cs.rowGap,
			paddingBlock: cs.paddingBlock,
			articleHeight: art.offsetHeight,
			childCount: children.length,
			visualGaps: gaps,
			childRectsTop: rects.map((r) => r.top),
		}
	})
console.log(JSON.stringify(detailsHost, null, 2))

console.log('\n--- (2) FormControls flush input alignment ---')
await page.goto('http://localhost:5173/#/form-controls', { waitUntil: 'networkidle' })
await page.waitForTimeout(500)
const formAlign = await page
	.locator('#form-controls-flat-flush-controls article')
	.first()
	.evaluate((art) => {
		const rows = Array.from(art.querySelectorAll(':scope > div'))
		return rows.map((row) => {
			const cs = getComputedStyle(row)
			const label = row.querySelector('label')
			const input = row.querySelector('input, select, textarea')
			const rowRect = row.getBoundingClientRect()
			const labelRect = label?.getBoundingClientRect()
			const inputRect = input?.getBoundingClientRect()
			return {
				rowHeight: row.offsetHeight,
				rowDisplay: cs.display,
				rowAlign: cs.alignItems,
				labelHeight: label?.offsetHeight,
				labelTop: labelRect?.top ? labelRect.top - rowRect.top : null,
				inputTag: input?.tagName,
				inputHeight: input?.offsetHeight,
				inputTop: inputRect?.top ? inputRect.top - rowRect.top : null,
				inputPaddingBlock: input ? getComputedStyle(input).paddingBlock : null,
				inputBlockSize: input ? getComputedStyle(input).blockSize : null,
			}
		})
	})
console.log(JSON.stringify(formAlign, null, 2))

console.log('\n--- (3) Article gap value default ---')
const articleDefaults = await page.evaluate(() => {
	const a = document.createElement('article')
	document.body.appendChild(a)
	const cs = getComputedStyle(a)
	const result = {
		display: cs.display,
		gap: cs.gap,
		rowGap: cs.rowGap,
		paddingBlock: cs.paddingBlock,
		setArticleGap: cs.getPropertyValue('--set-article-gap'),
	}
	a.remove()
	return result
})
console.log(JSON.stringify(articleDefaults, null, 2))

await browser.close()
