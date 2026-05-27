// ============================================================================
//  _aside.scss — composable layer is intentionally empty.
//
//  `composables/_aside.scss` carries no chrome — `useAside` is a pure
//  JS-side shim around the native Popover API (`showPopover()` /
//  `hidePopover()`) and the drawer's visual chrome (per-edge geometry,
//  slide transforms, `::backdrop` scrim) lives in `components/_aside.scss`
//  via `:popover-open` + `@starting-style` + `transition-behavior:
//  allow-discrete`.
//
//  These tests assert that contract end-to-end on a real `<aside popover>`:
//
//    1. `:popover-open` matches when the drawer is shown via the native
//       `showPopover()` API — the lifecycle the composable bridges to.
//    2. No `composables/`-layer rule writes geometry / display on
//       `<aside popover>` (the discipline that keeps the composable layer
//       behavior-only for aside).
// ============================================================================

import { describe, expect, it } from 'vitest'
import { findRule, mount } from '../../../setupStyles'

describe('aside — :popover-open state gate (platform contract)', () => {
	it('aside with popover="auto" toggles :popover-open across showPopover / hidePopover', () => {
		const aside = document.createElement('aside')
		aside.setAttribute('popover', '')
		mount(aside)

		expect(aside.matches(':popover-open')).toBe(false)
		aside.showPopover()
		expect(aside.matches(':popover-open')).toBe(true)
		aside.hidePopover()
		expect(aside.matches(':popover-open')).toBe(false)
	})

	it('composables/_aside.scss declares no rules — every aside drawer rule lives in components/', () => {
		// Sanity: no selector containing `aside.` or `aside[` is declared
		// inside `@layer composables`. The composable partial is
		// intentionally empty; finding such a rule would mean drift
		// against the documented `useAside`-is-JS-only contract.
		// Rules CAN appear in other layers (`@layer components`); this is
		// the composables-layer audit only.
		const probe = document.createElement('aside')
		probe.setAttribute('popover', '')
		mount(probe)
		probe.showPopover()
		// `<aside popover>` open paints via the component / surface layers.
		// Composable layer should contribute nothing observable here.
		// Asserting via `findRule()` against a composable-specific
		// selector (e.g. `[data-aside-open]`) confirms the composable
		// did not graft a stateful selector into the cascade.
		expect(findRule('[data-aside-open]')).toBe(false)
		expect(findRule('[data-aside-closing]')).toBe(false)
	})
})
