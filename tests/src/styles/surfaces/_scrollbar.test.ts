// ============================================================================
//  _scrollbar.scss — UA scrollbar styling tokens.
// ============================================================================

import { afterEach, describe, expect, it } from 'vitest'
import { mount, rootToken, style } from '../../../setupStyles'

afterEach(() => {
	for (const child of Array.from(document.body.children)) {
		if (child.tagName === 'DIV') child.remove()
	}
})

describe('scrollbar — surface tokens', () => {
	it('--set-scrollbar-thumb-color resolves on :root', () => {
		expect(rootToken('--set-scrollbar-thumb-color')).not.toBe('')
	})

	it('--set-scrollbar-track-color resolves on :root', () => {
		// `transparent` is a valid resolved value and should not be empty.
		expect(rootToken('--set-scrollbar-track-color')).not.toBe('')
	})

	it('--set-scrollbar-width resolves on :root', () => {
		expect(rootToken('--set-scrollbar-width')).not.toBe('')
	})

	it('--set-scrollbar-gutter resolves on :root', () => {
		expect(rootToken('--set-scrollbar-gutter')).not.toBe('')
	})
})

describe('scrollbar — applied properties', () => {
	it('applies scrollbar-width on :root', () => {
		expect(style(document.documentElement, 'scrollbar-width')).not.toBe('')
	})

	it('applies scrollbar-gutter on :root', () => {
		expect(style(document.documentElement, 'scrollbar-gutter')).not.toBe('')
	})
})

describe('scrollbar — universal application + per-element override', () => {
	// Regression: an earlier rule declared `scrollbar-{color,width,gutter}`
	// only on `:root`. Per CSS Scrollbars Module Level 1, `scrollbar-color`
	// IS inherited but `scrollbar-width` + `scrollbar-gutter` are NOT —
	// nested scroll containers stayed at the UA default (auto width,
	// auto gutter). AND because var() substitution happens at the
	// declaring element, a descendant overriding
	// `--set-scrollbar-thumb-color` did NOT re-resolve the inherited
	// `scrollbar-color` — the override silently did nothing. Fix:
	// apply the trio on `*, *::before, *::after` so every element
	// re-resolves its own var() chain AND applies the non-inherited
	// width / gutter to every scroll container.
	function buildScrollable(overrides?: string): HTMLDivElement {
		const div = document.createElement('div')
		div.style.cssText = `block-size: 4rem; overflow-y: auto; ${overrides ?? ''}`
		div.innerHTML = '<p style="block-size: 10rem"></p>'
		mount(div)
		return div
	}

	it('nested scroll container picks up `scrollbar-width: thin` (NOT inherited; must be re-applied)', () => {
		const div = buildScrollable()
		// Without the universal rule this would resolve to `auto`
		// (the UA default for nested containers).
		expect(style(div, 'scrollbar-width')).toBe('thin')
	})

	it('nested scroll container picks up `scrollbar-gutter: stable` (NOT inherited)', () => {
		const div = buildScrollable()
		expect(style(div, 'scrollbar-gutter')).toBe('stable')
	})

	it('per-element `--set-scrollbar-width` override re-resolves at the host', () => {
		const div = buildScrollable('--set-scrollbar-width: auto;')
		// The host's own var() retune flows through because
		// `scrollbar-width` is re-declared at every element via the
		// universal rule.
		expect(style(div, 'scrollbar-width')).toBe('auto')
	})

	it('per-element `--set-scrollbar-thumb-color` override re-resolves at the host', () => {
		const div = buildScrollable('--set-scrollbar-thumb-color: rgb(255, 0, 0);')
		// Without the universal rule the inherited (root-resolved)
		// `scrollbar-color` would win — the override would be silent.
		const scrollbarColor = style(div, 'scrollbar-color')
		expect(scrollbarColor).toContain('rgb(255, 0, 0)')
	})
})
