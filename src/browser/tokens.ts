// ============================================================================
// Token Surface (TS mirror)
//
// Mirrors the framework's --set-* CSS custom properties plus the semantic
// variant colors we register with Tailwind v4 via @theme. Every leaf is a
// CSS variable name, suitable for getComputedStyle().getPropertyValue() or
// Element.style.setProperty().
//
// Tailwind's full token surface (--color-blue-500, --spacing-4, --radius-md,
// --text-base, --duration-150, …) is intentionally NOT mirrored here —
// Tailwind's own docs and IntelliSense are the source of truth.
//
// Usage:
//   const value = getComputedStyle(el).getPropertyValue(tokens.color.primary)
//   el.style.setProperty(tokens.color.primary, 'hsl(150 70% 40%)')
// ============================================================================

export const tokens = {
	// Semantic variants (registered in @theme; Tailwind generates utilities).
	color: {
		primary: '--color-primary',
		secondary: '--color-secondary',
		tertiary: '--color-tertiary',
		success: '--color-success',
		warning: '--color-warning',
		danger: '--color-danger',
		information: '--color-information',
	},

	// Framework defaults that have no Tailwind equivalent.
	transitionDuration: '--set-transition-duration',

	// Focus ring sub-tokens.
	focus: {
		boxShadowWidth: '--set-focus-box-shadow-width',
		boxShadowOpacity: '--set-focus-box-shadow-opacity',
	},

	// Variant context — set by .primary / .secondary / … modifier classes.
	variant: {
		color: '--set-variant-color',
		backgroundColor: '--set-variant-background-color',
		borderColor: '--set-variant-border-color',
		borderWidth: '--set-variant-border-width',
	},

	// Size context — set by .small / .large.
	size: {
		paddingInline: '--set-size-padding-inline',
		paddingBlock: '--set-size-padding-block',
		fontSize: '--set-size-font-size',
		borderRadius: '--set-size-border-radius',
	},

	// Style context — set by .ghost / .filled.
	style: {
		color: '--set-style-color',
		backgroundColor: '--set-style-background-color',
		borderColor: '--set-style-border-color',
		borderWidth: '--set-style-border-width',
	},

	// Element-scoped tokens declared on `button` itself.
	button: {
		color: '--set-button-color',
		backgroundColor: '--set-button-background-color',
		borderColor: '--set-button-border-color',
		borderWidth: '--set-button-border-width',
		borderRadius: '--set-button-border-radius',
		paddingInline: '--set-button-padding-inline',
		paddingBlock: '--set-button-padding-block',
		fontSize: '--set-button-font-size',
		fontWeight: '--set-button-font-weight',
		lineHeight: '--set-button-line-height',
		transitionDuration: '--set-button-transition-duration',
		cursor: '--set-button-cursor',
		disabled: { opacity: '--set-button-disabled-opacity' },
		focus: { boxShadow: '--set-button-focus-box-shadow' },
	},
} as const
