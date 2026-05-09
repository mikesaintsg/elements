// ============================================================================
//  components/_body.scss — bare <body> as the layout shell.
//
//  When <body> has a <main> direct child, the framework promotes it to a
//  CSS-grid template-area layout. Sectioning children are placed into named
//  areas without classes.
// ============================================================================

import { afterEach, describe, expect, it } from 'vitest'
import { build, style } from '../../../setupStyles'

// The body element is shared across the test session. We capture and restore
// its original markup + computed styles so each test starts clean.

const ORIGINAL_BODY_DISPLAY = (() => globalThis.getComputedStyle(document.body).display)()

afterEach(() => {
	// Empty out any direct children we appended; the test runner's own teardown
	// removes mounted elements but body can accumulate unscoped children if a
	// test forgot. Belt-and-suspenders.
	for (const child of Array.from(document.body.children)) {
		if (
			child.tagName === 'MAIN' ||
			child.tagName === 'HEADER' ||
			child.tagName === 'FOOTER' ||
			child.tagName === 'NAV' ||
			child.tagName === 'ASIDE'
		) {
			child.remove()
		}
	}
})

describe('body — layout shell activates with a <main> descendant', () => {
	it('a bare <body> with no <main> descendant has no special layout', () => {
		// Whatever the body's default display was at session start, it should
		// stay that. The layout shell is conditional on `:has(main)`.
		expect(globalThis.getComputedStyle(document.body).display).toBe(ORIGINAL_BODY_DISPLAY)
	})

	it('adding a direct <main> child promotes <body> to a grid', () => {
		const main = build('main', '', 'page content')
		document.body.appendChild(main)
		expect(globalThis.getComputedStyle(document.body).display).toBe('grid')
		main.remove()
	})

	it('every direct sectioning child is placed in the right grid area', () => {
		const header = build('header', '', 'Top')
		const nav = build('nav', '', 'Side')
		const main = build('main', '', 'Body')
		const aside = build('aside', '', 'Toc')
		const footer = build('footer', '', 'Bottom')
		document.body.append(header, nav, main, aside, footer)

		expect(style(header, 'grid-area')).toContain('header')
		expect(style(nav, 'grid-area')).toContain('nav')
		expect(style(main, 'grid-area')).toContain('main')
		expect(style(aside, 'grid-area')).toContain('aside')
		expect(style(footer, 'grid-area')).toContain('footer')

		header.remove()
		nav.remove()
		main.remove()
		aside.remove()
		footer.remove()
	})

	it('once-removed sectioning children (Vue/React mount-point pattern) are also placed', () => {
		// Simulate `<body><div id="app"><main>…</main><header>…</header></div></body>`.
		const wrapper = build('div')
		wrapper.style.display = 'contents'
		const header = build('header', '', 'Top')
		const main = build('main', '', 'Body')
		wrapper.append(header, main)
		document.body.appendChild(wrapper)

		expect(style(header, 'grid-area')).toContain('header')
		expect(style(main, 'grid-area')).toContain('main')

		wrapper.remove()
	})

	it('main inside the shell scrolls independently (overflow-y: auto)', () => {
		const main = build('main', '', 'page content')
		document.body.appendChild(main)
		expect(style(main, 'overflow-y')).toBe('auto')
		main.remove()
	})
})
