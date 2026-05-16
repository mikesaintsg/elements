// ============================================================================
//  TablesPage — per-page BESPOKE parity (Phase-2 §7, Elements-Content).
//
//  Reason to exist: the canonical reference for the table family. The
//  guard: the structural elements render (table/caption/thead/tbody/
//  tfoot/tr/th/td), the Bootstrap-style chrome cascade is exercised
//  (.striped / .striped-columns / .bordered / .borderless / .small /
//  .bottom / .nowrap), a per-row variant tint (<tr class="{variant}">)
//  is shown for every modifiers.variant, the row-state tiers (.active /
//  [aria-selected]) + <tbody class="divided"> + the scrollable wrapper
//  + the ARIA-disclosure row-expansion chrome are present. Asserted
//  against the MOUNTED DOM (one expansion row is seeded open).
// ============================================================================

import { describe, expect, it } from 'vitest'
import { createApp } from 'vue'
import { modifiers } from '@elements/browser'
import { TablesPage } from '../../../../app/browser/index.js'

const VARIANTS = Object.values(modifiers.variant) as string[]

function mount(): { host: HTMLElement; teardown: () => void } {
	const host = document.createElement('div')
	document.body.appendChild(host)
	const app = createApp(TablesPage)
	app.mount(host)
	return {
		host,
		teardown: () => {
			app.unmount()
			host.remove()
		},
	}
}

describe('TablesPage — render smoke', () => {
	it('mounts + renders the "tables" intro section', () => {
		const { host, teardown } = mount()
		try {
			const intro = host.querySelector('section#tables-intro')
			expect(intro).not.toBeNull()
			expect(intro?.querySelector('h1')?.textContent?.trim()).toBe('Tables')
		} finally {
			teardown()
		}
	})
})

describe('TablesPage — table structure renders (§7)', () => {
	for (const tag of ['table', 'caption', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td']) {
		// On failure: `<${tag}>` not demonstrated — TablesPage is the
		// canonical reference for the full table element family.
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

describe('TablesPage — chrome cascade (§7)', () => {
	for (const cls of [
		'striped',
		'striped-columns',
		'bordered',
		'borderless',
		'small',
		'bottom',
		'nowrap',
	]) {
		// On failure: `<table class="${cls}">` not demonstrated — the
		// table chrome vocabulary must be shown on the reference page.
		it(`renders table.${cls}`, () => {
			const { host, teardown } = mount()
			try {
				expect(host.querySelector(`table.${cls}`)).not.toBeNull()
			} finally {
				teardown()
			}
		})
	}

	for (const v of VARIANTS) {
		// On failure: the per-row variant-tint section renders no
		// `<tr class="${v}">` — every row-tint variant must be shown.
		it(`renders tr.${v}`, () => {
			const { host, teardown } = mount()
			try {
				expect(host.querySelector(`tr.${v}`)).not.toBeNull()
			} finally {
				teardown()
			}
		})
	}
})

describe('TablesPage — row state, divided tbody, scrollable, expansion (§7)', () => {
	it('demonstrates the row-state tiers (.active + [aria-selected])', () => {
		const { host, teardown } = mount()
		try {
			expect(host.querySelector('tr.active')).not.toBeNull()
			expect(host.querySelector('tr[aria-selected="true"]')).not.toBeNull()
		} finally {
			teardown()
		}
	})

	it('renders <tbody class="divided"> and the scrollable wrapper', () => {
		const { host, teardown } = mount()
		try {
			expect(host.querySelector('tbody.divided')).not.toBeNull()
			expect(host.querySelector('div.scrollable')).not.toBeNull()
		} finally {
			teardown()
		}
	})

	it('demonstrates the row-expansion disclosure chrome (one seeded open)', () => {
		const { host, teardown } = mount()
		try {
			// The host row carries [data-table-expanded] while open; the
			// sibling row holds <div data-table-expansion-panel>. The
			// toggle is a real <button aria-expanded aria-controls>.
			expect(host.querySelector('tr[data-table-expanded]')).not.toBeNull()
			expect(host.querySelector('[data-table-expansion-panel]')).not.toBeNull()
			expect(host.querySelector('button[aria-expanded][aria-controls]')).not.toBeNull()
		} finally {
			teardown()
		}
	})
})
