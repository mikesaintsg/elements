// ============================================================================
// Modifier Class Registry (TS mirror)
//
// Every framework-defined modifier class name appears here as a string
// literal, grouped by dimension. Use the constants for typed component
// props, programmatic application, and test factories.
//
// Five orthogonal dimensions; an element takes at most one value per
// dimension:
//   variant   — semantic identity (primary, success, …)
//   size      — physical scale    (small, large)
//   style     — fill treatment    (ghost, filled)
//   state     — interaction state (disabled, active, loading)
//   placement — anchor placement  (top, bottom, start, end + corners)
//
// Names that would also have been useful but collide with Tailwind utility
// classes are intentionally not shipped — see modifiers.md §"Shape" and
// §"Style" for the dropped values (.rounded, .outline, .pill, .square).
// Consumers compose Tailwind utilities directly for those cases.
//
// Usage:
//   <Button variant="primary" size="large" />        // typed via Variant/Size
//   el.classList.add(modifiers.variant.primary)
//   createButton({ variant: 'primary', size: 'large' })
// ============================================================================

export const modifiers = {
	variant: {
		primary: 'primary',
		secondary: 'secondary',
		tertiary: 'tertiary',
		success: 'success',
		warning: 'warning',
		danger: 'danger',
		information: 'information',
	},

	size: {
		small: 'small',
		large: 'large',
	},

	style: {
		ghost: 'ghost',
		filled: 'filled',
	},

	state: {
		disabled: 'disabled',
		active: 'active',
		loading: 'loading',
	},

	// Placement modifiers — eight values describing where an
	// anchor-positioned element lands relative to its anchor. Maps directly
	// to `position-area` keywords. The block-axis name comes first for
	// corners (`top-start` reads "above the anchor, aligned to the inline-
	// start edge"). Some elements (<aside>, <nav>, manual-popover toasts)
	// reuse these names for their own per-element placement semantics —
	// the modifier's `position-area` rule is a no-op on non-anchor-
	// positioned elements, so the cohabitation is clean.
	placement: {
		top: 'top',
		bottom: 'bottom',
		start: 'start',
		end: 'end',
		// Kebab-case keys preserve the framework invariant that every TS
		// leaf is a verbatim copy of the CSS class name (parity test in
		// modifiers.test.ts). Consumers reach for `modifiers.placement
		// ['top-start']` rather than a camelCase alias — the hyphenated
		// form mirrors the CSS rule and refactors stay safe.
		'top-start': 'top-start',
		'top-end': 'top-end',
		'bottom-start': 'bottom-start',
		'bottom-end': 'bottom-end',
	},
} as const

export type Variant = (typeof modifiers.variant)[keyof typeof modifiers.variant]
export type Size = (typeof modifiers.size)[keyof typeof modifiers.size]
export type Style = (typeof modifiers.style)[keyof typeof modifiers.style]
export type State = (typeof modifiers.state)[keyof typeof modifiers.state]
// `Placement` is the cross-cutting floating-panel side+alignment union;
// the canonical declaration lives in `./types.ts` so every popover-bearing
// composable / factory imports the same shape. Re-export here so consumers
// pulling modifiers + placement-as-a-class-name both find one type.
export type { Placement } from './types.js'
