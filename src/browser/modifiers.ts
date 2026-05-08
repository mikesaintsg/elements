// ============================================================================
// Modifier Class Registry (TS mirror)
//
// Every framework-defined modifier class name appears here as a string
// literal, grouped by dimension. Use the constants for typed component
// props, programmatic application, and test factories.
//
// Four orthogonal dimensions; an element takes at most one value per
// dimension:
//   variant — semantic identity (primary, success, …)
//   size    — physical scale    (small, large)
//   style   — fill treatment    (ghost, filled)
//   state   — interaction state (disabled, active, loading)
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
} as const

export type Variant = (typeof modifiers.variant)[keyof typeof modifiers.variant]
export type Size = (typeof modifiers.size)[keyof typeof modifiers.size]
export type Style = (typeof modifiers.style)[keyof typeof modifiers.style]
export type State = (typeof modifiers.state)[keyof typeof modifiers.state]
