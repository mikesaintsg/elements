// ============================================================================
//  _ol.scss / _ul.scss / _li.scss — list element baselines.
//
//  Regression coverage for fixes captured in plan.md §9.7:
//
//    - Bare `<ol>` lost UA decimal markers after Tailwind preflight
//      zeroed `list-style`. `_ol.scss` now re-asserts `decimal` at the
//      root, `lower-alpha` one level deep, `lower-roman` two levels deep.
//    - `<li class="success active">` painted the subtle tint instead
//      of the saturated identity because the `.active` rule sat BEFORE
//      the per-variant tints in `_li.scss` (same specificity → later
//      wins). Reordered the partial so variant rules come first and
//      `.active` follows them.
//    - `--set-group-active-{color, background-color}` declared on the
//      parent `<ul class="group">` had its `var()` substitution resolved
//      at the parent scope (where the variant is undefined), severing
//      the cascade for `<li class="success active">`. Relocated to
//      `ul.group > li, ol.group > li` so the variant cascade and the
//      consumer co-locate on the same element.
// ============================================================================

import { afterEach, describe, expect, it } from 'vitest'
import { build, mount, style } from '../../../setupStyles'

afterEach(() => {
	for (const child of Array.from(document.body.children)) {
		const tag = child.tagName
		if (['OL', 'UL', 'LI'].includes(tag)) child.remove()
	}
})

describe('ol — UA list-style-type cascade restored', () => {
	it('a bare `<ol>` paints `list-style-type: decimal` (Tailwind preflight reset is reversed)', () => {
		const ol = build('ol')
		const li = build('li')
		li.textContent = 'Item'
		ol.appendChild(li)
		mount(ol)

		expect(style(ol, 'list-style-type')).toBe('decimal')
	})

	it('nested `<ol>` switches to `lower-alpha` at depth 1', () => {
		const outer = build('ol')
		const outerLi = build('li')
		const inner = build('ol')
		const innerLi = build('li')
		inner.appendChild(innerLi)
		outerLi.appendChild(inner)
		outer.appendChild(outerLi)
		mount(outer)

		expect(style(inner, 'list-style-type')).toBe('lower-alpha')
	})
})

describe('ul — UA list-style-type cascade restored', () => {
	it('a bare `<ul>` paints `list-style-type: disc`', () => {
		const ul = build('ul')
		const li = build('li')
		li.textContent = 'Item'
		ul.appendChild(li)
		mount(ul)

		expect(style(ul, 'list-style-type')).toBe('disc')
	})

	it('nested `<ul>` switches to `circle` at depth 1', () => {
		const outer = build('ul')
		const outerLi = build('li')
		const inner = build('ul')
		const innerLi = build('li')
		inner.appendChild(innerLi)
		outerLi.appendChild(inner)
		outer.appendChild(outerLi)
		mount(outer)

		expect(style(inner, 'list-style-type')).toBe('circle')
	})
})

describe('li — list-group `.active` paints the saturated variant fill (NOT subtle tint)', () => {
	// Regression: `_li.scss` declared the `.active` rule BEFORE the
	// per-variant tints. `<li class="success active">` resolved to the
	// variant's `bg-subtle` color because the same-specificity later-
	// wins rule order meant `.success` overwrote `.active`'s
	// `--set-variant-background-color`. Reordered the partial so the
	// seven variant tints come FIRST and `.active` follows them — now
	// `<li class="success active">` paints the saturated
	// `--color-success` fill with white text.
	function buildRow(classes: string): HTMLElement {
		const ul = build('ul', 'group')
		const li = build('li', classes, 'Row')
		ul.appendChild(li)
		mount(ul)
		return li
	}

	it('`<li class="active">` (no variant) defaults to the primary fill', () => {
		const li = buildRow('active')
		const bg = style(li, 'background-color')
		// Resolves to `--color-primary`; we just assert it's NOT the
		// transparent / canvas default.
		expect(bg).not.toBe('rgba(0, 0, 0, 0)')
		expect(bg).not.toBe('rgb(255, 255, 255)')
	})

	it('`<li class="success active">` paints saturated success (not bg-subtle)', () => {
		const subtleLi = buildRow('success')
		const activeLi = buildRow('success active')

		const subtleBg = style(subtleLi, 'background-color')
		const activeBg = style(activeLi, 'background-color')

		// The bare-variant row paints the BG-SUBTLE tier; the active
		// row paints the SATURATED variant. They must differ — if they
		// match, the `.active` rule is shadowing wrong.
		expect(activeBg).not.toBe(subtleBg)
		// Active row also takes white text on the saturated fill
		// (every variant takes white in the framework's contrast
		// contract — recorded in `modifiers/_variants.scss`).
		expect(style(activeLi, 'color')).toBe('rgb(255, 255, 255)')
	})
})
