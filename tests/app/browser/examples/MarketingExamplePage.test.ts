// ============================================================================
//  MarketingExamplePage — per-page BESPOKE parity (Phase-2 §7, Examples).
//
//  Reason to exist: the page mounts the ExamplesShell wrapper PLUS the
//  MarketingExample app under it. The guards anchor on the load-bearing
//  semantic landmarks the body-shell-style port has to keep alive:
//
//    1. <main> — single page-content host (no sidebar nav; marketing pages
//       render just <main>). Zero-padding tokens applied for edge-to-edge
//       section layout.
//    2. <footer aria-label="Site footer"> — site footer lives INSIDE <main>
//       as the last section (body-shell footer row auto-sizing would crush
//       the 1fr main track on mobile with a tall multi-column footer).
//    3. <header class="marketing-nav"> — sticky site nav inside <main>.
//    4. <dialog aria-label="Marketing example source"> — view-source dialog
//       from ExamplesShell.
// ============================================================================

import { describe, expect, it } from 'vitest'
import { createApp } from 'vue'
import { MarketingExamplePage } from '../../../../app/browser/index.js'

function mount(): { host: HTMLElement; teardown: () => void } {
	const host = document.createElement('div')
	document.body.appendChild(host)
	const app = createApp(MarketingExamplePage)
	app.mount(host)
	return {
		host,
		teardown: () => {
			app.unmount()
			host.remove()
		},
	}
}

describe('MarketingExamplePage — render smoke', () => {
	it('mounts + renders <main> containing all sections including the site footer', () => {
		const { host, teardown } = mount()
		try {
			expect(host.querySelector('main')).not.toBeNull()
			// Site footer is inside <main> (not a body-shell sibling) to avoid
			// the body-grid auto-row-sizing issue on mobile.
			expect(host.querySelector('main footer[aria-label="Site footer"]')).not.toBeNull()
		} finally {
			teardown()
		}
	})
})

describe('MarketingExamplePage — load-bearing landmarks', () => {
	it('<main> is present with zero-padding token overrides', () => {
		const { host, teardown } = mount()
		try {
			const main = host.querySelector('main')
			expect(main).not.toBeNull()
			const style = main?.getAttribute('style') ?? ''
			expect(style).toContain('--set-main-padding-inline: 0')
		} finally {
			teardown()
		}
	})

	it('site nav header is inside <main>', () => {
		const { host, teardown } = mount()
		try {
			const main = host.querySelector('main')
			const marketingNav = main?.querySelector('header.marketing-nav')
			expect(marketingNav).not.toBeNull()
		} finally {
			teardown()
		}
	})

	it('<footer aria-label="Site footer"> is present inside <main>', () => {
		const { host, teardown } = mount()
		try {
			// The site footer is inside <main> (last section) to avoid the body-grid
			// auto-row-sizing issue that would crush <main> to near-zero height on
			// mobile when the footer is a tall body-shell sibling. Query specifically
			// by aria-label to avoid picking up dialog inner footers.
			const footer = host.querySelector('footer[aria-label="Site footer"]')
			expect(footer).not.toBeNull()
			// Confirm it's inside <main>, not a body-shell sibling
			const main = host.querySelector('main')
			expect(main?.contains(footer)).toBe(true)
		} finally {
			teardown()
		}
	})

	it('hero section with h1 is inside <main>', () => {
		const { host, teardown } = mount()
		try {
			const hero = host.querySelector('main section[aria-label="Hero"]')
			expect(hero).not.toBeNull()
			expect(hero?.querySelector('h1')).not.toBeNull()
		} finally {
			teardown()
		}
	})

	it('view-source <dialog> is in the DOM (closed by default)', () => {
		const { host: _host, teardown } = mount()
		try {
			const dialog = document.querySelector('dialog[aria-label="Marketing example source"]')
			expect(dialog).not.toBeNull()
			expect((dialog as HTMLDialogElement | null)?.open).toBe(false)
		} finally {
			teardown()
		}
	})

	it('renders ExamplesShell toolbar (menu[role="toolbar"]) in the document', () => {
		const { host: _host, teardown } = mount()
		try {
			// ExamplesShell toolbar is a sibling of the example, not a descendant;
			// query the full document.
			const toolbars = document.querySelectorAll('menu[role="toolbar"]')
			expect(toolbars.length).toBeGreaterThanOrEqual(1)
		} finally {
			teardown()
		}
	})
})
