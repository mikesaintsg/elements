// ============================================================================
//  DetailsPage — per-page BESPOKE parity (Phase-2 §7, Elements-Interactive).
//
//  Reason to exist: the bare `<details>` baseline carries the container
//  cascade — every `modifiers.variant` + size/style (no interaction
//  states: `<details>` is a disclosure, not a control). Asserted against
//  the MOUNTED DOM.
// ============================================================================

import { describe, expect, it } from 'vitest'
import { createApp } from 'vue'
import { modifiers } from '@elements/browser'
import { DetailsPage } from '../../../../app/browser/index.js'

const VARIANTS = Object.values(modifiers.variant) as string[]

function mount(): { host: HTMLElement; teardown: () => void } {
	const host = document.createElement('div')
	document.body.appendChild(host)
	const app = createApp(DetailsPage)
	app.mount(host)
	return {
		host,
		teardown: () => {
			app.unmount()
			host.remove()
		},
	}
}

describe('DetailsPage — render smoke', () => {
	it('mounts + renders the "details" intro section', () => {
		const { host, teardown } = mount()
		try {
			const intro = host.querySelector('section#details-intro')
			expect(intro).not.toBeNull()
			expect(intro?.querySelector('h1')?.textContent?.trim()).toBe('Details')
		} finally {
			teardown()
		}
	})

	it('renders <details> with a <summary> first child', () => {
		const { host, teardown } = mount()
		try {
			const d = host.querySelector('details')
			expect(d).not.toBeNull()
			expect(d?.querySelector('summary')).not.toBeNull()
		} finally {
			teardown()
		}
	})
})

describe('DetailsPage — container cascade (§7)', () => {
	for (const v of VARIANTS) {
		// On failure: `<details class="${v}">` not demonstrated.
		it(`renders details.${v}`, () => {
			const { host, teardown } = mount()
			try {
				expect(host.querySelector(`details.${v}`)).not.toBeNull()
			} finally {
				teardown()
			}
		})
	}

	for (const cls of ['small', 'large', 'subtle', 'filled']) {
		// On failure: `<details class="${cls}">` not demonstrated.
		it(`renders details.${cls}`, () => {
			const { host, teardown } = mount()
			try {
				expect(host.querySelector(`details.${cls}`)).not.toBeNull()
			} finally {
				teardown()
			}
		})
	}
})
