// ============================================================================
//  MarketingExample — framework-usage assertions.
//
//  Separate from MarketingExamplePage.test.ts so the assertions stay
//  focused on the framework idioms the example exercises (rather than
//  the ExamplesShell scaffolding). The page-level test owns landmarks;
//  this file owns counts + data wiring.
// ============================================================================

import { describe, expect, it } from 'vitest'
import { createApp } from 'vue'
import MarketingExample from '../../../../app/browser/examples/MarketingExample.vue'

function mount(): { host: HTMLElement; teardown: () => void } {
	const host = document.createElement('div')
	document.body.appendChild(host)
	const app = createApp(MarketingExample)
	app.mount(host)
	return {
		host,
		teardown: () => {
			app.unmount()
			host.remove()
		},
	}
}

describe('MarketingExample — framework idioms', () => {
	it('renders <main> with token override inline styles', () => {
		const { host, teardown } = mount()
		try {
			const main = host.querySelector('main')
			expect(main).not.toBeNull()
			// Main padding tokens must be zeroed so sections own their gutters.
			const style = main?.getAttribute('style') ?? ''
			expect(style).toContain('--set-main-padding-inline: 0')
			expect(style).toContain('--set-main-padding-block: 0')
			expect(style).toContain('--set-main-gap: 0')
		} finally {
			teardown()
		}
	})

	it('renders a top nav header inside <main>', () => {
		const { host, teardown } = mount()
		try {
			const main = host.querySelector('main')
			const nav = main?.querySelector('header.marketing-nav')
			expect(nav).not.toBeNull()
		} finally {
			teardown()
		}
	})

	it('hero section has h1 + two CTA anchors', () => {
		const { host, teardown } = mount()
		try {
			const hero = host.querySelector('section[aria-label="Hero"]')
			expect(hero).not.toBeNull()
			expect(hero?.querySelector('h1')).not.toBeNull()
			// Primary + secondary CTAs (both are <a> with class 'primary filled' or 'subtle filled')
			const ctas = hero?.querySelectorAll('a.filled')
			expect(ctas?.length ?? 0).toBeGreaterThanOrEqual(2)
		} finally {
			teardown()
		}
	})

	it('renders 4 stat <article>s inside the browser-window mockup', () => {
		const { host, teardown } = mount()
		try {
			const windowBody = host.querySelector('.marketing-window-body')
			expect(windowBody).not.toBeNull()
			const cards = windowBody?.querySelectorAll('article')
			expect(cards?.length).toBe(4)
		} finally {
			teardown()
		}
	})

	it('logos band has 6 logo items', () => {
		const { host, teardown } = mount()
		try {
			const logos = host.querySelector('section[aria-label="Trusted by"]')
			expect(logos).not.toBeNull()
			const items = logos?.querySelectorAll('li')
			expect(items?.length).toBe(6)
		} finally {
			teardown()
		}
	})

	it('renders 6 feature <article>s in the features grid', () => {
		const { host, teardown } = mount()
		try {
			const features = host.querySelector('section#features')
			expect(features).not.toBeNull()
			const cards = features?.querySelectorAll('article')
			expect(cards?.length).toBe(6)
		} finally {
			teardown()
		}
	})

	it('stats band has 4 stat entries', () => {
		const { host, teardown } = mount()
		try {
			const stats = host.querySelector('section[aria-label="Key statistics"]')
			expect(stats).not.toBeNull()
			// The dl > div pattern: 4 divs wrapping dt+dd
			const entries = stats?.querySelectorAll('dl > div')
			expect(entries?.length).toBe(4)
		} finally {
			teardown()
		}
	})

	it('renders 3 pricing <article>s, middle one has primary class', () => {
		const { host, teardown } = mount()
		try {
			const pricing = host.querySelector('section#pricing')
			expect(pricing).not.toBeNull()
			const cards = pricing?.querySelectorAll('article')
			expect(cards?.length).toBe(3)
			// The Studio (featured) plan uses class="primary …"
			const featured = pricing?.querySelector('article.primary')
			expect(featured).not.toBeNull()
		} finally {
			teardown()
		}
	})

	it('CTA banner has two CTA anchors', () => {
		const { host, teardown } = mount()
		try {
			const cta = host.querySelector('section[aria-label="Call to action"]')
			expect(cta).not.toBeNull()
			const buttons = cta?.querySelectorAll('a.filled')
			expect(buttons?.length ?? 0).toBeGreaterThanOrEqual(2)
		} finally {
			teardown()
		}
	})

	it('site <footer> has 4 nav regions for link columns', () => {
		const { host, teardown } = mount()
		try {
			// Query by aria-label to target the site footer specifically.
			const footer = host.querySelector('footer[aria-label="Site footer"]')
			expect(footer).not.toBeNull()
			const navs = footer?.querySelectorAll('nav')
			expect(navs?.length ?? 0).toBeGreaterThanOrEqual(4)
		} finally {
			teardown()
		}
	})
})
