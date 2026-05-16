// ============================================================================
//  ButtonPage — per-page BESPOKE parity (Phase-2 §7, Elements-Interactive).
//
//  ButtonPage is the framework's REFERENCE implementation of the modifier
//  cascade, so its reason to exist is the strongest §7 form: a rendered
//  `<button>` carrying EVERY `modifiers.variant` + the size / style /
//  state values the cascade reference demonstrates. Modifiers are applied
//  via `:class` bindings, so this must assert against the MOUNTED DOM.
// ============================================================================

import { describe, expect, it } from 'vitest'
import { createApp } from 'vue'
import { modifiers } from '@elements/browser'
import { ButtonPage } from '../../../../app/browser/index.js'

const VARIANTS = Object.values(modifiers.variant) as string[]

function mount(): { host: HTMLElement; teardown: () => void } {
	const host = document.createElement('div')
	document.body.appendChild(host)
	const app = createApp(ButtonPage)
	app.mount(host)
	return { host, teardown: () => { app.unmount(); host.remove() } }
}

describe('ButtonPage — render smoke', () => {
	it('mounts + renders the "button" intro section', () => {
		const { host, teardown } = mount()
		try {
			const intro = host.querySelector('section#button-intro')
			expect(intro).not.toBeNull()
			expect(intro?.querySelector('h1')?.textContent?.trim()).toBe('Button')
		} finally {
			teardown()
		}
	})
})

describe('ButtonPage — the modifier cascade is fully demonstrated (§7)', () => {
	it('renders many <button> elements', () => {
		const { host, teardown } = mount()
		try {
			expect(host.querySelectorAll('button').length).toBeGreaterThan(10)
		} finally {
			teardown()
		}
	})

	for (const v of VARIANTS) {
		// On failure: `modifiers.variant.${v}` is not demonstrated on a
		// <button> — the cascade reference page must show every variant.
		it(`renders a button.${v}`, () => {
			const { host, teardown } = mount()
			try {
				expect(host.querySelector(`button.${v}`)).not.toBeNull()
			} finally {
				teardown()
			}
		})
	}

	// Size / style / state the cascade reference demonstrates (verified
	// against the live render — `.disabled` is attribute-driven, not a
	// class, so it is intentionally excluded here).
	for (const cls of ['small', 'large', 'subtle', 'filled', 'active', 'loading']) {
		// On failure: `.${cls}` is not demonstrated on a <button>.
		it(`renders a button.${cls}`, () => {
			const { host, teardown } = mount()
			try {
				expect(host.querySelector(`button.${cls}`)).not.toBeNull()
			} finally {
				teardown()
			}
		})
	}
})
