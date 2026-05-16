// ============================================================================
//  components/_role-group.scss — `[role='group']` / `[role='toolbar']`
//  button-group layout, and the VARIANT CASCADE it relies on.
//
//  The cascade is emergent, not a rule in `_role-group.scss`: a `.{variant}`
//  on the group / toolbar host sets the inheriting `--set-variant-*` context
//  tokens, the bare `<button>` surface chain terminates in
//  `var(--set-variant-background-color, transparent)`, so a bare child
//  resolves the inherited variant while a child with its own `.{variant}`
//  wins. These tests pin that behaviour so a future refactor of the button
//  surface chain or the variant tokens can't silently sever the inheritance.
// ============================================================================

import { describe, expect, it } from 'vitest'
import { build, colorEqual, mount, pixels, style, token } from '../../../setupStyles'

/** `<div role="group|toolbar" class="…"> + <button> children</div>`, mounted. */
function group(
	role: 'group' | 'toolbar',
	hostClasses: string,
	children: readonly { text: string; classes?: string }[],
): { host: HTMLElement; buttons: HTMLButtonElement[] } {
	const host = build('div', hostClasses)
	host.setAttribute('role', role)
	const buttons = children.map((c) => {
		const b = build('button', c.classes ?? '', c.text)
		host.appendChild(b)
		return b
	})
	mount(host)
	return { host, buttons }
}

describe('role-group — token surface', () => {
	it('declares --set-role-group-border-width on the host', () => {
		const { host } = group('group', '', [{ text: 'One' }])
		expect(token(host, '--set-role-group-border-width').trim()).not.toBe('')
	})

	it('[role="group"] is an inline-flex row; [role="toolbar"] is a wrapping flex row', () => {
		const { host: g } = group('group', '', [{ text: 'One' }])
		expect(style(g, 'display')).toBe('inline-flex')

		const { host: t } = group('toolbar', '', [{ text: 'One' }])
		expect(style(t, 'display')).toBe('flex')
		expect(style(t, 'flex-wrap')).toBe('wrap')
	})
})

describe('role-group — variant cascade (the cascading-stylesheet contract)', () => {
	it('a `.{variant}` host tints every BARE child button via inherited --set-variant-*', () => {
		const { buttons } = group('group', 'success', [{ text: 'Save' }, { text: 'Save draft' }])
		for (const btn of buttons) {
			// Bare child resolves the inherited success fill — no per-button
			// modifier, no `[role='group'] > button` colour rule.
			expect(colorEqual(style(btn, 'background-color'), 'var(--color-success)')).toBe(true)
			// Every variant takes white text (the framework's symmetric contract).
			expect(style(btn, 'color')).toBe('rgb(255, 255, 255)')
			// The cascaded `--set-variant-border-width: 1px` reaches the child,
			// which is what makes the negative-margin overlap meaningful.
			expect(pixels(btn, 'border-top-width')).toBe(1)
		}
	})

	it('a child carrying its OWN `.{variant}` wins over the host variant', () => {
		const { buttons } = group('group', 'success', [
			{ text: 'Save' },
			{ text: 'Delete', classes: 'danger' },
		])
		expect(colorEqual(style(buttons[0], 'background-color'), 'var(--color-success)')).toBe(true)
		// Explicit child re-declares --set-variant-* on itself → danger wins.
		expect(colorEqual(style(buttons[1], 'background-color'), 'var(--color-danger)')).toBe(true)
	})

	it('a variant-LESS group applies no false tint (bare neutral children)', () => {
		const { buttons } = group('group', '', [{ text: 'One' }, { text: 'Two' }])
		for (const btn of buttons) {
			expect(style(btn, 'background-color')).toBe('rgba(0, 0, 0, 0)')
			// border-width stays 0 → the negative-margin overlap collapses to 0.
			expect(pixels(btn, 'border-top-width')).toBe(0)
		}
	})

	it('the cascade reaches a NESTED group through a `[role="toolbar"]` variant host', () => {
		const toolbar = build('div', 'information')
		toolbar.setAttribute('role', 'toolbar')
		const inner = build('div')
		inner.setAttribute('role', 'group')
		const btn = build('button', '', 'Bold')
		inner.appendChild(btn)
		toolbar.appendChild(inner)
		mount(toolbar)

		expect(colorEqual(style(btn, 'background-color'), 'var(--color-information)')).toBe(true)
	})
})

describe('role-group — border overlap activates with the cascade', () => {
	it('a variant host gives every-button-after-the-first a negative inline-start margin', () => {
		const { buttons } = group('group', 'primary', [
			{ text: 'One' },
			{ text: 'Two' },
			{ text: 'Three' },
		])
		// First child: no overlap. Subsequent: pulled back by the shared edge.
		expect(pixels(buttons[0], 'margin-left')).toBe(0)
		expect(pixels(buttons[1], 'margin-left')).toBeLessThan(0)
		expect(pixels(buttons[2], 'margin-left')).toBeLessThan(0)
	})

	it('inner buttons square off; only the first/last keep an outer corner radius', () => {
		const { buttons } = group('group', 'primary', [
			{ text: 'One' },
			{ text: 'Two' },
			{ text: 'Three' },
		])
		// Middle button: all corners squared.
		expect(pixels(buttons[1], 'border-top-left-radius')).toBe(0)
		expect(pixels(buttons[1], 'border-top-right-radius')).toBe(0)
		// First button keeps its leading (inline-start) corner.
		expect(pixels(buttons[0], 'border-top-left-radius')).toBeGreaterThan(0)
		// Last button keeps its trailing (inline-end) corner.
		expect(pixels(buttons[2], 'border-top-right-radius')).toBeGreaterThan(0)
	})
})
