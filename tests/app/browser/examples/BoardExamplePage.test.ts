// ============================================================================
//  BoardExamplePage — drag-and-drop board pillar smoke + landmark parity.
//
//  Mounts ExamplesShell + BoardExample. Guards the <header> app bar, the
//  four column <section>s inside <main>, the reorderable card lists (the
//  useDrag hosts with `[data-index]` children), and the ExamplesShell
//  view-source <dialog>.
// ============================================================================

import { describe, expect, it } from 'vitest'
import { createApp } from 'vue'
import { BoardExamplePage } from '../../../../app/browser/index.js'

function mount(): { host: HTMLElement; teardown: () => void } {
	const host = document.createElement('div')
	document.body.appendChild(host)
	const app = createApp(BoardExamplePage)
	app.mount(host)
	return {
		host,
		teardown: () => {
			app.unmount()
			host.remove()
		},
	}
}

describe('BoardExamplePage — render smoke', () => {
	it('mounts app bar + main with four columns', () => {
		const { host, teardown } = mount()
		try {
			expect(host.querySelector('header')).not.toBeNull()
			expect(host.querySelector('main')).not.toBeNull()
			expect(host.querySelectorAll('main section').length).toBe(4)
		} finally {
			teardown()
		}
	})
})

describe('BoardExamplePage — load-bearing landmarks', () => {
	it('renders draggable card rows with [data-index] in each column', () => {
		const { host, teardown } = mount()
		try {
			expect(host.querySelectorAll('main ul li[data-index]').length).toBeGreaterThan(0)
			expect(host.querySelectorAll('main article').length).toBeGreaterThan(0)
		} finally {
			teardown()
		}
	})

	it('view-source <dialog> is present and closed by default', () => {
		const { teardown } = mount()
		try {
			const dialog = document.querySelector('dialog[aria-label="Board example source"]')
			expect(dialog).not.toBeNull()
			expect((dialog as HTMLDialogElement | null)?.open).toBe(false)
		} finally {
			teardown()
		}
	})
})

// ── Interactive drives ─────────────────────────────────────────────────────
//
// HTML5 DragEvent synthesis in headless chromium is brittle (the drag
// gesture requires real OS-level pointer capture). The useDrag selection
// sub-machine is mouse-click driven though — clicking a row toggles its
// `.selected` class via the factory's `select()` API. We drive that
// surface (which is what visual reviewers see) rather than the full
// drag/drop pipeline (which the unit tests cover with mocked
// DragEvents).

describe('BoardExamplePage — useDrag selection drives', () => {
	function waitFor(ms: number): Promise<void> {
		return new Promise((resolve) => {
			setTimeout(resolve, ms)
		})
	}

	it('clicking a card row marks it `.selected` (useDrag select)', async () => {
		const { host, teardown } = mount()
		try {
			await waitFor(100)
			const card = host.querySelector<HTMLElement>('main ul li[data-index]')
			if (!card) throw new Error('no draggable card row in DOM')
			card.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0 }))
			card.dispatchEvent(new MouseEvent('click', { bubbles: true, button: 0 }))
			await waitFor(100)
			// `.selected` class is set by useDrag on the active row.
			expect(card.classList.contains('selected')).toBe(true)
		} finally {
			teardown()
		}
	})
})
