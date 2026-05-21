// ============================================================================
//  EditorialExamplePage — content & typography pillar smoke.
//
//  The page mounts ExamplesShell + EditorialExample. Guards anchor on
//  the long-form content elements the example demonstrates with zero
//  custom CSS: the article, a <figure><img>, a <table>, the heading, and
//  the <details> FAQ disclosures.
// ============================================================================

import { describe, expect, it } from 'vitest'
import { createApp } from 'vue'
import { EditorialExamplePage } from '../../../../app/browser/index.js'

function mount(): { host: HTMLElement; teardown: () => void } {
	const host = document.createElement('div')
	document.body.appendChild(host)
	const app = createApp(EditorialExamplePage)
	app.mount(host)
	return {
		host,
		teardown: () => {
			app.unmount()
			host.remove()
		},
	}
}

describe('EditorialExamplePage — render smoke', () => {
	it('mounts the article with a single page <h1>', () => {
		const { host, teardown } = mount()
		try {
			expect(host.querySelector('main article')).not.toBeNull()
			expect(host.querySelectorAll('main h1').length).toBe(1)
		} finally {
			teardown()
		}
	})
})

describe('EditorialExamplePage — content vocabulary', () => {
	it('renders figure/img, blockquote, table, and details disclosures', () => {
		const { host, teardown } = mount()
		try {
			expect(host.querySelector('figure img')).not.toBeNull()
			expect(host.querySelector('blockquote cite')).not.toBeNull()
			expect(host.querySelector('table')).not.toBeNull()
			expect(host.querySelectorAll('details').length).toBeGreaterThanOrEqual(3)
		} finally {
			teardown()
		}
	})

	it('authors no scoped <style> block (zero custom CSS pillar)', () => {
		// The Editorial example's selling point is that it needs no CSS at
		// all; this guard fails loudly if a future edit reaches for one.
		const { teardown } = mount()
		try {
			const dialog = document.querySelector('dialog[aria-label="Editorial example source"]')
			const source = dialog?.querySelector('.examples-source')?.textContent ?? ''
			expect(source.includes('<style')).toBe(false)
		} finally {
			teardown()
		}
	})
})
