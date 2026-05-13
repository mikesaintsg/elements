import { chromium } from 'playwright-core'

const browser = await chromium.launch({
	executablePath: '/opt/pw-browsers/chromium-1217/chrome-linux64/chrome',
	headless: true,
})
const page = await browser.newPage()
await page.goto('http://localhost:5173/#/modifiers', { waitUntil: 'networkidle' })
await page.waitForTimeout(300)

// Select "loading" in the state picker.
const stateSelect = page.locator('#modifiers-combinations select').last()
await stateSelect.selectOption('loading')
await page.waitForTimeout(150)

// Verify spinner is now rendered.
const spinnerCount = await page.locator('#modifiers-combinations .spinner').count()
console.log(`After picking loading: ${spinnerCount} spinner(s) inside the composed button.`)

// Also check article color contrast in the filled card.
await page.goto('http://localhost:5173/#/modifiers/modifiers-styles', { waitUntil: 'networkidle' })
await page.waitForTimeout(300)
const filledArticleColors = await page.evaluate(() => {
	const article = document.querySelector('article.primary.filled')
	if (!article) return { error: 'no-filled-article' }
	const label = article.querySelector('p')
	if (!label) return { error: 'no-label-p' }
	const articleCs = getComputedStyle(article)
	const labelCs = getComputedStyle(label)
	return {
		articleBg: articleCs.backgroundColor,
		labelColor: labelCs.color,
	}
})
console.log('Filled-article styles section:', filledArticleColors)

await browser.close()
