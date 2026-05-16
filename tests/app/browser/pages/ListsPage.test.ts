// ============================================================================
//  ListsPage — per-page BESPOKE parity (Phase-2 §7, Elements-Content).
//
//  Reason to exist: the canonical reference for the three list families
//  (<ul>/<ol>/<li>, the .group list-group chrome, <dl>/<dt>/<dd>). The
//  guard: the core list elements render, the list-group chrome cascade
//  (.group + .flush + .horizontal) is exercised, and a per-row variant
//  tint (<li class="{variant}">) is demonstrated for every
//  modifiers.variant. Asserted against the MOUNTED DOM.
// ============================================================================

import { describe, expect, it } from 'vitest'
import { createApp } from 'vue'
import { modifiers } from '@elements/browser'
import { ListsPage } from '../../../../app/browser/index.js'

const VARIANTS = Object.values(modifiers.variant) as string[]

function mount(): { host: HTMLElement; teardown: () => void } {
	const host = document.createElement('div')
	document.body.appendChild(host)
	const app = createApp(ListsPage)
	app.mount(host)
	return {
		host,
		teardown: () => {
			app.unmount()
			host.remove()
		},
	}
}

describe('ListsPage — render smoke', () => {
	it('mounts + renders the "lists" intro section', () => {
		const { host, teardown } = mount()
		try {
			const intro = host.querySelector('section#lists-intro')
			expect(intro).not.toBeNull()
			expect(intro?.querySelector('h1')?.textContent?.trim()).toBe('Lists')
		} finally {
			teardown()
		}
	})
})

describe('ListsPage — the three list families render (§7)', () => {
	for (const tag of ['ul', 'ol', 'li', 'dl', 'dt', 'dd']) {
		// On failure: `<${tag}>` not demonstrated — ListsPage is the
		// canonical reference for the list element families.
		it(`renders <${tag}>`, () => {
			const { host, teardown } = mount()
			try {
				expect(host.querySelector(tag)).not.toBeNull()
			} finally {
				teardown()
			}
		})
	}
})

describe('ListsPage — list-group chrome cascade (§7)', () => {
	// .group opts into the bordered list-group chrome; .flush drops the
	// outer edge; .horizontal flips rows to columns (verified live).
	it('renders ul.group and ol.group', () => {
		const { host, teardown } = mount()
		try {
			expect(host.querySelector('ul.group')).not.toBeNull()
			expect(host.querySelector('ol.group')).not.toBeNull()
		} finally {
			teardown()
		}
	})

	for (const cls of ['flush', 'horizontal']) {
		it(`renders ul.group.${cls}`, () => {
			const { host, teardown } = mount()
			try {
				expect(host.querySelector(`ul.group.${cls}`)).not.toBeNull()
			} finally {
				teardown()
			}
		})
	}

	for (const v of VARIANTS) {
		// On failure: the per-row variant-tint section renders no
		// `<li class="${v}">` — the list-group page must show every
		// row-tint variant (mirrors the alert/list-group triplet).
		it(`renders li.${v}`, () => {
			const { host, teardown } = mount()
			try {
				expect(host.querySelector(`li.${v}`)).not.toBeNull()
			} finally {
				teardown()
			}
		})
	}
})
