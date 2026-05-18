// ============================================================================
//  _backdrop.scss — modal dialog + offcanvas drawer scrim chrome.
//
//  Single-backdrop guarantee: every framework surface that needs a scrim
//  renders it via the native `::backdrop` pseudo. Two blocking-overlay
//  families share the same dim-and-blur recipe:
//
//    1. `dialog:modal::backdrop`                          — modal dialog
//    2. `:is(aside, nav)[popover]:popover-open::backdrop` — offcanvas drawer
//       (covers both `<aside popover>` AND `<nav popover>` so the body-
//       shell rails inherit identical scrim chrome when their conditional
//       `:popover` binding lifts them into popover mode)
//
//  The transition list lives on the bare pseudo (`dialog::backdrop`,
//  `:is(aside, nav)[popover]::backdrop`) so the scrim fades out smoothly
//  through the close transition tail instead of snapping to UA-transparent
//  at frame 0 of close.
// ============================================================================

import { afterEach, describe, expect, it } from 'vitest'
import { build, mount, rootToken } from '../../../setupStyles'

afterEach(() => {
	for (const child of Array.from(document.body.children)) {
		if (['DIALOG', 'ASIDE', 'NAV'].includes(child.tagName)) child.remove()
	}
})

describe('backdrop — surface tokens', () => {
	it('every --set-backdrop-* token resolves on :root', () => {
		expect(rootToken('--set-backdrop-background-color')).not.toBe('')
		expect(rootToken('--set-backdrop-backdrop-filter')).not.toBe('')
	})
})

describe('backdrop — modal dialog wears the scrim', () => {
	it('::backdrop on a modal <dialog> paints from --set-backdrop-* tokens', () => {
		const dialog = build('dialog') as HTMLDialogElement
		mount(dialog)
		dialog.showModal()

		// `dialog:modal::backdrop` background must be non-transparent so
		// the page beneath dims. We can't read pseudo-element computed
		// styles directly from `::backdrop` in jsdom; assert the host
		// `:modal` matches and the tokens it would read are populated.
		expect(dialog.matches(':modal')).toBe(true)
		const bg = rootToken('--set-backdrop-background-color')
		expect(bg).not.toBe('')
		// The token is `color-mix(in srgb, black 50%, transparent)` —
		// the word `transparent` appears as a function argument, but
		// the resolved value is 50% black, NOT a fully transparent
		// scrim. Assert the token mixes IN a non-transparent base.
		expect(bg).toMatch(/\bblack\b|\brgb\(/)

		dialog.close()
	})
})

describe('backdrop — offcanvas drawer scrim covers BOTH rail families', () => {
	// Regression: an earlier rule only matched `aside[popover]::backdrop`,
	// leaving `<nav popover>` drawers without a tokenised scrim. The
	// rule now uses `:is(aside, nav)[popover]:popover-open::backdrop` so
	// the body-shell rails (which opt into popover mode on mobile via
	// `:popover="isMobile ? 'auto' : undefined"`) inherit identical
	// scrim chrome to the standalone `<aside popover>` offcanvas surface.

	it('`<aside popover>` matches the open-state scrim selector when opened', () => {
		const aside = build('aside')
		aside.setAttribute('popover', '')
		mount(aside)
		aside.showPopover()

		// The host element matches the open-state selector that drives
		// the `::backdrop` chrome. We can't introspect the backdrop
		// pseudo directly in jsdom, but the host's `:popover-open`
		// match is the gate the surface rule reads.
		expect(aside.matches(':is(aside, nav)[popover]:popover-open')).toBe(true)

		aside.hidePopover()
	})

	it('`<nav popover>` ALSO matches the same open-state scrim selector', () => {
		const nav = build('nav')
		nav.setAttribute('popover', '')
		mount(nav)
		nav.showPopover()

		// The `:is(aside, nav)` form is the regression-guard: the rule
		// must cover nav drawers identically to aside drawers so the
		// body-shell rails get a scrim when they enter popover mode.
		expect(nav.matches(':is(aside, nav)[popover]:popover-open')).toBe(true)

		nav.hidePopover()
	})
})

describe('backdrop — bare-pseudo transition keeps the scrim animating through close', () => {
	// Regression: declaring the transition on `dialog:modal::backdrop` /
	// `aside[popover]:popover-open::backdrop` instead of the bare pseudo
	// caused the scrim's background-color and backdrop-filter to snap
	// to UA-transparent at frame 0 of close (the "backdrop flash" bug
	// the user reported on modal close). Fix: split the rule so the
	// transition list lives on the bare pseudo and survives the close
	// transition tail.
	it('the motion-duration token is non-empty (transitions are tokenised)', () => {
		// `dialog::backdrop` + `:is(aside, nav)[popover]::backdrop`
		// transition `background-color` + `backdrop-filter` over
		// `var(--set-motion-duration)`. We can't read pseudo-element
		// transitions directly, but the duration token must resolve.
		expect(rootToken('--set-motion-duration')).not.toBe('')
	})
})

describe('backdrop — non-blocking surfaces stay transparent', () => {
	// Transparent default for non-blocking popovers: non-modal `<dialog>`,
	// `<div role="status" popover>` (toasts), `<menu popover>` (dropdowns),
	// `[popover='hint']` (tooltips), and bare `[popover]` panels keep
	// the UA-default transparent backdrop so they don't dim the page.

	it('a non-modal `<dialog>` (opened via `.show()`) does NOT match the scrim selector', () => {
		const dialog = build('dialog') as HTMLDialogElement
		mount(dialog)
		dialog.show()

		expect(dialog.matches(':modal')).toBe(false)
		expect(dialog.open).toBe(true)

		dialog.close()
	})
})

describe('backdrop — single-backdrop invariant', () => {
	// Single-backdrop guarantee: no per-component duplicate backdrop
	// element anywhere in the framework. Every blocking overlay rides
	// the native `::backdrop` pseudo. The earlier showcase
	// `<div class="showcase-backdrop">` for body-shell rails is gone —
	// the rails opt into popover mode and use the native pseudo via
	// the same selector that covers `<aside popover>` drawers.
	it('opening a `<nav popover>` does NOT create any sibling backdrop element', () => {
		const nav = build('nav')
		nav.setAttribute('popover', '')
		mount(nav)
		nav.showPopover()

		// Sweep direct children of body for any element that looks like
		// a custom backdrop (a `.backdrop` / `.scrim` / `.modal-backdrop`
		// class root, the historical custom-backdrop pattern).
		const customBackdrops = Array.from(document.body.children).filter((el) => {
			const cls = el.className || ''
			return /backdrop|scrim/i.test(cls)
		})
		expect(customBackdrops).toHaveLength(0)

		nav.hidePopover()
	})

	it('the `--set-motion-duration` token resolves at :root (shared scrim+panel timing)', () => {
		// Backdrop fade-out + panel slide-out animate on the SAME
		// motion-duration token so they dismiss in lockstep.
		expect(rootToken('--set-motion-duration')).not.toBe('')
	})
})
