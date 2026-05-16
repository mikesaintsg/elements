// ============================================================================
//  ArticleCardPage — per-page BESPOKE parity (Phase-2 §7, Components).
//
//  Reason to exist: <article> is the framework's flagship
//  "element-IS-component" proof — a bare <article> is a card with no
//  .card class. The guard: a class-less <article> renders, the modifier
//  cascade (variant border tint + .subtle/.filled/.small/.large/
//  .disabled/.flush) is exercised, and the auto-banded slots
//  (direct-child header/footer/img/ul.group) are demonstrated. The
//  variant grid is CURATED — `secondary` is intentionally absent (the
//  neutral baseline already covers the "quiet" case it would serve), so
//  the variant assertion is modifiers.variant MINUS that one documented
//  omission. Asserted against the MOUNTED DOM.
// ============================================================================

import { describe, expect, it } from 'vitest'
import { createApp } from 'vue'
import { modifiers } from '@elements/browser'
import { ArticleCardPage } from '../../../../app/browser/index.js'

// The page renders a representative variant grid: every variant EXCEPT
// `secondary` (verified absent — it would duplicate the neutral
// baseline). Tie to src so a new src variant the page also demos is
// picked up automatically; the one curated omission is explicit.
const RENDERED_VARIANTS = (Object.values(modifiers.variant) as string[]).filter(
	(v) => v !== 'secondary',
)

function mount(): { host: HTMLElement; teardown: () => void } {
	const host = document.createElement('div')
	document.body.appendChild(host)
	const app = createApp(ArticleCardPage)
	app.mount(host)
	return { host, teardown: () => { app.unmount(); host.remove() } }
}

describe('ArticleCardPage — render smoke', () => {
	it('mounts + renders the "article-card" intro section', () => {
		const { host, teardown } = mount()
		try {
			const intro = host.querySelector('section#article-card-intro')
			expect(intro).not.toBeNull()
			expect(intro?.querySelector('h1')?.textContent?.trim()).toBe('Article card')
		} finally {
			teardown()
		}
	})
})

describe('ArticleCardPage — element-IS-component proof (§7)', () => {
	it('renders a class-less bare <article> and many cards', () => {
		const { host, teardown } = mount()
		try {
			const articles = [...host.querySelectorAll('article')]
			expect(articles.length).toBeGreaterThan(10)
			// The flagship claim: an <article> with NO class is already a
			// card (no .card needed).
			expect(articles.some((a) => a.getAttribute('class') === null)).toBe(true)
		} finally {
			teardown()
		}
	})
})

describe('ArticleCardPage — modifier cascade (§7)', () => {
	for (const v of RENDERED_VARIANTS) {
		// On failure: the variant grid renders no `<article class="${v}">`
		// — the card reference must show every (curated) variant tint.
		it(`renders article.${v}`, () => {
			const { host, teardown } = mount()
			try {
				expect(host.querySelector(`article.${v}`)).not.toBeNull()
			} finally {
				teardown()
			}
		})
	}

	it('does NOT include `secondary` in the curated variant grid', () => {
		// Locks the documented omission: if a future edit adds an
		// article.secondary the page comment + this test must be revisited
		// together (not silently drift).
		const { host, teardown } = mount()
		try {
			expect(host.querySelector('article.secondary')).toBeNull()
		} finally {
			teardown()
		}
	})

	for (const cls of ['subtle', 'filled', 'small', 'large', 'disabled', 'flush']) {
		// On failure: `<article class="${cls}">` not demonstrated — the
		// card modifier vocabulary must be shown on the reference page.
		it(`renders article.${cls}`, () => {
			const { host, teardown } = mount()
			try {
				expect(host.querySelector(`article.${cls}`)).not.toBeNull()
			} finally {
				teardown()
			}
		})
	}
})

describe('ArticleCardPage — auto-banded slots (§7)', () => {
	// Direct-child header/footer/img/ul.group pick up framework chrome
	// structurally — no extra classes. Verified against the live render.
	const SLOTS: Readonly<Record<string, string>> = {
		'header band': 'article > header',
		'footer band': 'article > footer',
		'image bleed': 'article > img',
		'embedded list-group': 'article > ul.group',
		'embedded aside callout': 'article aside.warning',
	}
	for (const [label, selector] of Object.entries(SLOTS)) {
		it(`demonstrates the ${label} (${selector})`, () => {
			const { host, teardown } = mount()
			try {
				expect(host.querySelector(selector)).not.toBeNull()
			} finally {
				teardown()
			}
		})
	}
})
