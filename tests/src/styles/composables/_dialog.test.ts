// ============================================================================
//  _dialog.scss — state-gated layout modifier rules.
//
//  `composables/_dialog.scss` adds layout-modifier classes (`.small`,
//  `.large`, `.fullscreen`, `.scrollable`) on top of the element baseline
//  in `elements/_dialog.scss`. Two of those modifiers (`.scrollable`,
//  `.fullscreen`) declare `display: flex` and are GATED on the `[open]`
//  attribute — without the gate the modifier rule would shadow the UA
//  `dialog:not([open]) { display: none }` and the dialog would render as
//  a layout ghost after `.close()`.
//
//  These tests exercise the gate at the cascade level:
//
//    1. `findRule(...)` confirms the gated selector is declared.
//    2. With `[open]` set, the modifier rule applies (display: flex,
//       flex-direction: column, plus any modifier-specific paint).
//    3. With NO `[open]` ever applied, the UA `dialog:not([open]) {
//       display: none }` is intact — no layout ghost.
//
//  Post-`.close()` display does NOT snap to `none` synchronously — the
//  element-baseline `transition: display allow-discrete` in
//  `elements/_dialog.scss` deliberately delays the discrete change for
//  the motion duration (~250 ms) so the close animation can play. That
//  is the intended contract; asserting `display: none` right after
//  `.close()` would test the timing of the discrete transition, not the
//  gate. The gate proof is the three-step shape above.
// ============================================================================

import { describe, expect, it } from 'vitest'
import { findRule, mount, style } from '../../../setupStyles'

describe('dialog.scrollable — [open] gate', () => {
	it('rule is declared in the loaded cascade', () => {
		expect(findRule('dialog.scrollable[open]')).toBe(true)
	})

	it('with [open], the modifier rule applies', () => {
		const dialog = document.createElement('dialog')
		dialog.className = 'scrollable'
		mount(dialog)
		dialog.setAttribute('open', '')
		expect(style(dialog, 'display')).toBe('flex')
		expect(style(dialog, 'flex-direction')).toBe('column')
	})

	it('without [open], UA display: none is intact (no layout ghost)', () => {
		const dialog = document.createElement('dialog')
		dialog.className = 'scrollable'
		mount(dialog)
		expect(dialog.hasAttribute('open')).toBe(false)
		expect(style(dialog, 'display')).toBe('none')
	})
})

describe('dialog.fullscreen — [open] gate', () => {
	it('rule is declared in the loaded cascade', () => {
		expect(findRule('dialog.fullscreen[open]')).toBe(true)
	})

	it('with [open], the modifier rule applies and zeroes border-radius', () => {
		const dialog = document.createElement('dialog')
		dialog.className = 'fullscreen'
		mount(dialog)
		dialog.setAttribute('open', '')
		expect(style(dialog, 'display')).toBe('flex')
		expect(style(dialog, 'flex-direction')).toBe('column')
		expect(style(dialog, 'border-top-left-radius')).toBe('0px')
	})

	it('without [open], UA display: none is intact (no layout ghost)', () => {
		const dialog = document.createElement('dialog')
		dialog.className = 'fullscreen'
		mount(dialog)
		expect(dialog.hasAttribute('open')).toBe(false)
		expect(style(dialog, 'display')).toBe('none')
	})
})

describe('dialog.small / dialog.large — unguarded modifiers do not introduce ghosts', () => {
	// These two modifiers do NOT declare `display`, so they don't need an
	// `[open]` gate. They retune `--set-dialog-inline-size` only. Verify
	// the closed-state UA `display: none` is intact for these (i.e. they
	// don't accidentally introduce a layout ghost via some interaction
	// with the cascade).

	it('.small leaves the closed UA display: none intact', () => {
		const dialog = document.createElement('dialog')
		dialog.className = 'small'
		mount(dialog)
		expect(style(dialog, 'display')).toBe('none')
	})

	it('.large leaves the closed UA display: none intact', () => {
		const dialog = document.createElement('dialog')
		dialog.className = 'large'
		mount(dialog)
		expect(style(dialog, 'display')).toBe('none')
	})
})
