import { chromium } from 'playwright-core'

const browser = await chromium.launch({
	executablePath: '/opt/pw-browsers/chromium-1217/chrome-linux64/chrome',
	headless: true,
})

async function probe(url, hash, expectedSectionPrefix) {
	const page = await browser.newPage()
	const errors = []
	const warnings = []
	page.on('pageerror', (err) => errors.push(`PAGEERROR: ${err.message}`))
	page.on('console', (msg) => {
		if (msg.type() === 'error') errors.push(`CONSOLE ERROR: ${msg.text()}`)
		else if (msg.type() === 'warning') warnings.push(`WARN: ${msg.text()}`)
	})
	await page.goto(`${url}#/${hash}`, { waitUntil: 'networkidle' })
	await page.waitForTimeout(400)
	const h1 = await page
		.locator('h1')
		.first()
		.textContent()
		.catch(() => null)
	const sections = await page
		.locator(`section[id^="${expectedSectionPrefix}-"]`)
		.evaluateAll((els) => els.map((el) => el.id))
	console.log(`\n--- ${url} #/${hash} ---`)
	console.log(`h1: ${JSON.stringify(h1)}`)
	console.log(`Sections (${sections.length}): ${JSON.stringify(sections.slice(0, 6))}…`)
	console.log(`Errors (${errors.length}):`)
	errors.forEach((e) => console.log(`  ${e}`))
	console.log(`Warnings (${warnings.length}):`)
	warnings.slice(0, 3).forEach((w) => console.log(`  ${w}`))
	await page.close()
}

const devUrl = 'http://localhost:5173/'
const fileUrl = `file://${process.cwd()}/dist/showcase/index.html`

console.log('=== Dev server ===')
await probe(devUrl, 'tokens', 'tokens')
await probe(devUrl, 'theme', 'theme')
await probe(devUrl, 'modifiers', 'modifiers')
await probe(devUrl, 'placements', 'placements')

console.log('\n=== Minified showcase (file://) ===')
await probe(fileUrl, 'tokens', 'tokens')
await probe(fileUrl, 'theme', 'theme')
await probe(fileUrl, 'modifiers', 'modifiers')
await probe(fileUrl, 'placements', 'placements')

await browser.close()
