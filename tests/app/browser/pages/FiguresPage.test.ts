// ============================================================================
//  FiguresPage — per-page BESPOKE parity (Phase-2 §7, Elements-Content).
//
//  Reason to exist: the canonical reference for <figure> + <figcaption>.
//  <figure> is a SEMANTIC grouping (no variant/size cascade — the page
//  ships none), so the guard is the spec invariant the page teaches:
//  every <figure> pairs with a <figcaption>, and the full payload set
//  is demonstrated (image / block-quote / code listing / table / SVG /
//  figure-inside-an-article-card). Asserted against the MOUNTED DOM.
// ============================================================================

import { describe, expect, it } from 'vitest'
import { createApp } from 'vue'
import { FiguresPage } from '../../../../app/browser/index.js'

function mount(): { host: HTMLElement; teardown: () => void } {
	const host = document.createElement('div')
	document.body.appendChild(host)
	const app = createApp(FiguresPage)
	app.mount(host)
	return {
		host,
		teardown: () => {
			app.unmount()
			host.remove()
		},
	}
}

describe('FiguresPage — render smoke', () => {
	it('mounts + renders the "figures" intro section', () => {
		const { host, teardown } = mount()
		try {
			const intro = host.querySelector('section#figures-intro')
			expect(intro).not.toBeNull()
			expect(intro?.querySelector('h1')?.textContent?.trim()).toBe('Figures')
		} finally {
			teardown()
		}
	})
})

describe('FiguresPage — figure/figcaption invariant (§7)', () => {
	it('renders ≥6 <figure> elements, each with a <figcaption>', () => {
		const { host, teardown } = mount()
		try {
			const figures = [...host.querySelectorAll('figure')]
			expect(figures.length).toBeGreaterThanOrEqual(6)
			// The HTML5 invariant this page teaches: a <figcaption> is the
			// first/last child of every <figure>.
			for (const fig of figures) {
				expect(fig.querySelector('figcaption')).not.toBeNull()
			}
		} finally {
			teardown()
		}
	})
})

describe('FiguresPage — every figure payload variant is demonstrated (§7)', () => {
	const PAYLOADS: Readonly<Record<string, string>> = {
		image: 'figure img',
		'block-quote': 'figure blockquote',
		'code listing': 'figure pre code',
		table: 'figure table',
		'SVG diagram': 'figure svg',
		'inside an <article> card': 'article figure',
	}
	for (const [label, selector] of Object.entries(PAYLOADS)) {
		// On failure: the "${label}" figure payload is not demonstrated —
		// FiguresPage is the canonical reference for the figure pattern
		// across self-contained payload types.
		it(`demonstrates the ${label} payload (${selector})`, () => {
			const { host, teardown } = mount()
			try {
				expect(host.querySelector(selector)).not.toBeNull()
			} finally {
				teardown()
			}
		})
	}
})
