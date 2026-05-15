import { chromium } from 'playwright-core'

const browser = await chromium.launch({
	executablePath: '/opt/pw-browsers/chromium-1217/chrome-linux64/chrome',
	headless: true,
})

const page = await browser.newPage()
await page.goto('http://localhost:5173/#/theme', { waitUntil: 'networkidle' })
await page.waitForTimeout(400)

// Probe the inverted-tier card's computed bg vs fg.
const result = await page.evaluate(() => {
	const card = document.querySelector('#theme-inverted article')
	if (!card) return { error: 'no-card' }
	const cs = getComputedStyle(card)
	return {
		bg: cs.backgroundColor,
		fg: cs.color,
	}
})
console.log('Inverted tier card colors (light mode):', result)

// Flip to dark.
await page.evaluate(() => {
	document.documentElement.setAttribute('data-theme', 'dark')
})
await page.waitForTimeout(150)
const dark = await page.evaluate(() => {
	const card = document.querySelector('#theme-inverted article')
	const cs = getComputedStyle(card)
	return { bg: cs.backgroundColor, fg: cs.color }
})
console.log('Inverted tier card colors (dark mode):', dark)

await browser.close()
