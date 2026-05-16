// ============================================================================
//  FormSurfacesPage — per-page BESPOKE parity (Phase-2 §7, Surfaces).
//  PAGE_SURFACE_BUNDLES owner.
//
//  Reason to exist: the canonical demo for the four pseudo-element form
//  surfaces. Pseudo-elements have NO queryable node, so each bundle key
//  is verified via (a) its dedicated section AND (b) a concrete demo
//  element that actually exercises the surface:
//    - focus       → #form-surfaces-focus + the control opt-out <form>
//                    (input/textarea/select) + a focusable button
//    - placeholder → #form-surfaces-placeholder + input/textarea[placeholder]
//    - marker      → #form-surfaces-marker + <ul>/<ol> + the custom
//                    --set-marker-content list
//    - selection   → #form-surfaces-selection + .showcase-selection-demo
//  Asserted against the MOUNTED DOM.
// ============================================================================

import { describe, expect, it } from 'vitest'
import { createApp } from 'vue'
import { FormSurfacesPage } from '../../../../app/browser/index.js'
import { PAGE_SURFACE_BUNDLES } from './_contract'

const BUNDLE = PAGE_SURFACE_BUNDLES.FormSurfacesPage ?? []

function mount(): { host: HTMLElement; teardown: () => void } {
	const host = document.createElement('div')
	document.body.appendChild(host)
	const app = createApp(FormSurfacesPage)
	app.mount(host)
	return {
		host,
		teardown: () => {
			app.unmount()
			host.remove()
		},
	}
}

describe('FormSurfacesPage — render smoke', () => {
	it('mounts + renders the "form-surfaces" intro section', () => {
		const { host, teardown } = mount()
		try {
			const intro = host.querySelector('section#form-surfaces-intro')
			expect(intro).not.toBeNull()
			expect(intro?.querySelector('h1')?.textContent?.trim()).toBe('Form surfaces')
		} finally {
			teardown()
		}
	})
})

describe('FormSurfacesPage — bundle accounting (§7)', () => {
	it('the bundle is exactly the four surface keys', () => {
		expect([...BUNDLE].sort()).toEqual(['focus', 'marker', 'placeholder', 'selection'])
	})
})

describe('FormSurfacesPage — `focus` surface (§7)', () => {
	it('section + a focusable button + the form-control opt-out form', () => {
		const { host, teardown } = mount()
		try {
			expect(host.querySelector('section#form-surfaces-focus')).not.toBeNull()
			expect(host.querySelector('button[type="button"]')).not.toBeNull()
			// The opt-out trio: input / textarea / select declare their own
			// :focus-visible recipe — the page demonstrates all three.
			const form = host.querySelector('section#form-surfaces-focus form')
			expect(form?.querySelector('input')).not.toBeNull()
			expect(form?.querySelector('textarea')).not.toBeNull()
			expect(form?.querySelector('select')).not.toBeNull()
		} finally {
			teardown()
		}
	})
})

describe('FormSurfacesPage — `placeholder` surface (§7)', () => {
	it('section + input/textarea carrying a placeholder', () => {
		const { host, teardown } = mount()
		try {
			expect(host.querySelector('section#form-surfaces-placeholder')).not.toBeNull()
			const sec = host.querySelector('section#form-surfaces-placeholder')
			expect(sec?.querySelector('input[placeholder]')).not.toBeNull()
			expect(sec?.querySelector('textarea[placeholder]')).not.toBeNull()
		} finally {
			teardown()
		}
	})
})

describe('FormSurfacesPage — `marker` surface (§7)', () => {
	it('section + <ul>/<ol> + the custom --set-marker-content list', () => {
		const { host, teardown } = mount()
		try {
			const sec = host.querySelector('section#form-surfaces-marker')
			expect(sec).not.toBeNull()
			expect(sec?.querySelector('ul')).not.toBeNull()
			expect(sec?.querySelector('ol')).not.toBeNull()
			// The custom-glyph demo pins --set-marker-content inline.
			expect(sec?.querySelector('[style*="--set-marker-content"]')).not.toBeNull()
		} finally {
			teardown()
		}
	})
})

describe('FormSurfacesPage — `selection` surface (§7)', () => {
	it('section + the variant-scoped .showcase-selection-demo block', () => {
		const { host, teardown } = mount()
		try {
			const sec = host.querySelector('section#form-surfaces-selection')
			expect(sec).not.toBeNull()
			expect(sec?.querySelector('.showcase-selection-demo')).not.toBeNull()
		} finally {
			teardown()
		}
	})
})
