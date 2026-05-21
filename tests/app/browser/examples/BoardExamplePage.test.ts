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
