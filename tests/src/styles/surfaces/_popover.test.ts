// ============================================================================
//  _popover.scss — `[popover]` top-layer surface tokens + open-state chrome.
// ============================================================================

import { describe, expect, it } from 'vitest'
import { mount, pixels, rootToken, style, token } from '../../../setupStyles'

describe('popover — surface tokens', () => {
	it('every --set-popover-* token resolves on :root', () => {
		expect(rootToken('--set-popover-background-color')).not.toBe('')
		expect(rootToken('--set-popover-border-color')).not.toBe('')
		expect(rootToken('--set-popover-border-radius')).not.toBe('')
		expect(rootToken('--set-popover-padding-inline')).not.toBe('')
		expect(rootToken('--set-popover-padding-block')).not.toBe('')
		expect(rootToken('--set-popover-box-shadow')).not.toBe('')
		expect(rootToken('--set-popover-transition-duration')).not.toBe('')
	})
})

describe('popover — open chrome', () => {
	function buildPopover(): HTMLElement {
		const el = document.createElement('div')
		el.setAttribute('popover', '')
		el.textContent = 'panel'
		mount(el)
		return el
	}

	it('renders padding from --set-popover-padding-* when shown', () => {
		const el = buildPopover()
		el.showPopover()
		expect(pixels(el, 'padding-top')).toBeGreaterThan(0)
		expect(pixels(el, 'padding-left')).toBeGreaterThan(0)
		el.hidePopover()
	})

	it('renders a non-zero border-radius', () => {
		const el = buildPopover()
		el.showPopover()
		expect(pixels(el, 'border-top-left-radius')).toBeGreaterThan(0)
		el.hidePopover()
	})

	it('renders a non-empty box-shadow', () => {
		const el = buildPopover()
		el.showPopover()
		expect(style(el, 'box-shadow')).not.toBe('none')
		el.hidePopover()
	})

	it('exposes the popover-background-color token on the element', () => {
		const el = buildPopover()
		el.showPopover()
		expect(token(el, '--set-popover-background-color').trim()).not.toBe('')
		el.hidePopover()
	})
})

describe('popover — hint variant (tooltip)', () => {
	function buildHint(): HTMLElement {
		const el = document.createElement('div')
		el.setAttribute('popover', 'hint')
		el.textContent = 'Help text.'
		mount(el)
		return el
	}

	it('paints the inverted color + bg tier (--color-inverted text + inverted surface)', () => {
		const el = buildHint()
		el.showPopover()
		// Inverted bg is `color-mix(var(--color-inverted) 95%, transparent)`;
		// in light mode `--color-inverted` is the dark inverted tier, so the
		// hint bg resolves to a near-opaque dark colour — visibly distinct
		// from the panel surface (`--color-surface`).
		expect(token(el, '--set-popover-hint-background-color').trim()).not.toBe('')
		expect(token(el, '--set-popover-hint-color').trim()).not.toBe('')
		el.hidePopover()
	})

	it('clamps to --set-popover-hint-max-inline-size (12.5 rem) — token retune wins', () => {
		// Regression: an earlier rule set `max-inline-size:
		// var(--set-popover-hint-max-inline-size)` directly on the
		// `[popover='hint']` selector (specificity 0,1,0). The anchor-
		// position surface's `[popover]:not(output):not(aside):not(nav)`
		// rule has higher specificity (0,4,0) and wins for any
		// max-inline-size declaration here — the hint rendered at the
		// generic popover cap of 17.25 rem (276 px) instead of its
		// intended 12.5 rem (200 px). Fix: retune
		// `--set-popover-max-inline-size` at the hint scope so the anchor
		// surface's `min()` chain picks up the narrower value through
		// the token, no specificity bump needed.
		const el = buildHint()
		el.showPopover()
		// `--set-popover-max-inline-size` is retuned to the hint cap at
		// the element scope.
		expect(token(el, '--set-popover-max-inline-size').trim()).not.toBe('')
		// Resolved max-inline-size matches the 12.5 rem hint cap (200 px
		// at 16 px root) and NOT the panel cap (17.25 rem / 276 px).
		const maxW = pixels(el, 'max-inline-size')
		expect(maxW).toBeLessThan(250)
		expect(maxW).toBeGreaterThan(150)
		el.hidePopover()
	})

	it('clamps `max-block-size` to content size so position-try-fallbacks does not spuriously flip', () => {
		// Regression: the anchor-position surface declared
		// `max-block-size: var(--set-anchor-max-block-size)` (default
		// 18 rem / 288 px — the dropdown demand) at higher specificity
		// (0,4,0) than the hint scope. A 28 px tooltip would demand
		// 288 px, and the browser would flip the popover above the
		// anchor whenever there was <288 px of room below it — wrong
		// for tiny labels. Fix: re-pin `--set-anchor-max-block-size` at
		// the hint scope to the new `--set-popover-hint-max-block-size`
		// token (default `max-content`) so the demand equals the actual
		// content height.
		const el = buildHint()
		el.showPopover()
		// The hint-scope retune flows through the anchor surface's
		// `max-block-size` declaration.
		expect(token(el, '--set-anchor-max-block-size').trim()).toBe('max-content')
		el.hidePopover()
	})

	it('descendant color-override elements inherit the inverted hint color', () => {
		// Regression: descendants that paint canvas-tier text colors
		// (`<strong>` → text-strong, `<dd>` / `<small>` / `<figcaption>`
		// → text-muted) inherit-broke the inversion. The worst case is
		// `<strong>`: in light mode `--color-text-strong` = slate-950
		// (invisible on the dark hint bg); in dark mode it's white
		// (invisible on the light hint bg). Fix: hint scope explicitly
		// resets `color: inherit` on the known offenders so the
		// inversion flows end-to-end.
		const el = buildHint()
		el.innerHTML = '<strong>bold</strong><small>tiny</small><dd>def</dd><h3>heading</h3>'
		el.showPopover()
		const hintColor = style(el, 'color')
		const strong = el.querySelector('strong')
		const small = el.querySelector('small')
		const dd = el.querySelector('dd')
		const h3 = el.querySelector('h3')
		expect(strong && small && dd && h3).toBeTruthy()
		if (!strong || !small || !dd || !h3) return
		expect(style(strong, 'color')).toBe(hintColor)
		expect(style(small, 'color')).toBe(hintColor)
		expect(style(dd, 'color')).toBe(hintColor)
		expect(style(h3, 'color')).toBe(hintColor)
		el.hidePopover()
	})

	it('paints a smaller font-size than the generic panel', () => {
		const el = buildHint()
		el.showPopover()
		const hintFont = pixels(el, 'font-size')
		const panel = document.createElement('div')
		panel.setAttribute('popover', '')
		mount(panel)
		panel.showPopover()
		const panelFont = pixels(panel, 'font-size')
		expect(hintFont).toBeLessThanOrEqual(panelFont)
		el.hidePopover()
		panel.hidePopover()
	})

	it('`[role="tooltip"]` gets the same chrome as `[popover="hint"]`', () => {
		// CSS-only tooltips (no popover API, just role+aria-describedby)
		// must inherit the hint chrome so the visual contract is
		// identical regardless of how the consumer wires the tooltip.
		const el = document.createElement('div')
		el.setAttribute('role', 'tooltip')
		el.textContent = 'Help'
		mount(el)
		// Tokens resolve on `[role="tooltip"]` just like `[popover="hint"]`.
		expect(token(el, '--set-popover-hint-color').trim()).not.toBe('')
		expect(token(el, '--set-popover-hint-background-color').trim()).not.toBe('')
	})
})

// ── Tooltip-only assertions (formerly tooltip.test.ts) ─────────────────────
//
// Padding-comparison and :root token coverage for the hint variant. The
// element-level token resolution + role=tooltip parity + max-inline-size +
// inverted-color rules above cover the rest of the tooltip surface.

describe('popover — hint variant :root tokens', () => {
	it('exposes --set-popover-hint-* defaults on :root', () => {
		expect(rootToken('--set-popover-hint-color').trim()).not.toBe('')
		expect(rootToken('--set-popover-hint-background-color').trim()).not.toBe('')
		expect(rootToken('--set-popover-hint-padding-inline').trim()).not.toBe('')
		expect(rootToken('--set-popover-hint-max-inline-size').trim()).not.toBe('')
	})

	it('`[popover=hint]` paints smaller padding than a regular `[popover]`', () => {
		const regular = document.createElement('div')
		regular.setAttribute('popover', '')
		regular.id = 'reg-popover'
		mount(regular)

		const hint = document.createElement('div')
		hint.setAttribute('popover', 'hint')
		hint.id = 'hint-popover'
		mount(hint)

		expect(pixels(hint, 'padding-inline-start')).toBeLessThan(
			pixels(regular, 'padding-inline-start'),
		)
	})
})
