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

	// Element-scoped tokens declared on `a` itself.
	a: {
		color: '--set-a-color',
		backgroundColor: '--set-a-background-color',
		borderColor: '--set-a-border-color',
		borderWidth: '--set-a-border-width',
		borderRadius: '--set-a-border-radius',
		paddingInline: '--set-a-padding-inline',
		paddingBlock: '--set-a-padding-block',
		fontSize: '--set-a-font-size',
		textDecoration: '--set-a-text-decoration',
		transitionDuration: '--set-a-transition-duration',
		cursor: '--set-a-cursor',
		disabled: { opacity: '--set-a-disabled-opacity' },
		focus: { boxShadow: '--set-a-focus-box-shadow' },
	},

	// Element-scoped tokens declared on `input` itself.
	input: {
		color: '--set-input-color',
		backgroundColor: '--set-input-background-color',
		borderColor: '--set-input-border-color',
		borderWidth: '--set-input-border-width',
		borderRadius: '--set-input-border-radius',
		paddingInline: '--set-input-padding-inline',
		paddingBlock: '--set-input-padding-block',
		fontSize: '--set-input-font-size',
		lineHeight: '--set-input-line-height',
		transitionDuration: '--set-input-transition-duration',
		cursor: '--set-input-cursor',
		disabled: { opacity: '--set-input-disabled-opacity' },
		placeholder: { opacity: '--set-input-placeholder-opacity' },
		focus: {
			borderColor: '--set-input-focus-border-color',
			boxShadow: '--set-input-focus-box-shadow',
		},
	},

	// Element-scoped tokens declared on `textarea` itself.
	textarea: {
		color: '--set-textarea-color',
		backgroundColor: '--set-textarea-background-color',
		borderColor: '--set-textarea-border-color',
		borderWidth: '--set-textarea-border-width',
		borderRadius: '--set-textarea-border-radius',
		paddingInline: '--set-textarea-padding-inline',
		paddingBlock: '--set-textarea-padding-block',
		fontSize: '--set-textarea-font-size',
		lineHeight: '--set-textarea-line-height',
		minBlockSize: '--set-textarea-min-block-size',
		transitionDuration: '--set-textarea-transition-duration',
		cursor: '--set-textarea-cursor',
		disabled: { opacity: '--set-textarea-disabled-opacity' },
		placeholder: { opacity: '--set-textarea-placeholder-opacity' },
		focus: {
			borderColor: '--set-textarea-focus-border-color',
			boxShadow: '--set-textarea-focus-box-shadow',
		},
	},

	// Element-scoped tokens declared on `select` itself.
	select: {
		color: '--set-select-color',
		backgroundColor: '--set-select-background-color',
		borderColor: '--set-select-border-color',
		borderWidth: '--set-select-border-width',
		borderRadius: '--set-select-border-radius',
		paddingInline: '--set-select-padding-inline',
		paddingInlineEnd: '--set-select-padding-inline-end',
		paddingBlock: '--set-select-padding-block',
		fontSize: '--set-select-font-size',
		lineHeight: '--set-select-line-height',
		transitionDuration: '--set-select-transition-duration',
		cursor: '--set-select-cursor',
		chevronSize: '--set-select-chevron-size',
		disabled: { opacity: '--set-select-disabled-opacity' },
		focus: {
			borderColor: '--set-select-focus-border-color',
			boxShadow: '--set-select-focus-box-shadow',
		},
	},

	// Element-scoped tokens declared on `dialog` itself.
	dialog: {
		color: '--set-dialog-color',
		backgroundColor: '--set-dialog-background-color',
		borderColor: '--set-dialog-border-color',
		borderWidth: '--set-dialog-border-width',
		borderRadius: '--set-dialog-border-radius',
		paddingInline: '--set-dialog-padding-inline',
		paddingBlock: '--set-dialog-padding-block',
		fontSize: '--set-dialog-font-size',
		lineHeight: '--set-dialog-line-height',
		maxInlineSize: '--set-dialog-max-inline-size',
		maxBlockSize: '--set-dialog-max-block-size',
		boxShadow: '--set-dialog-box-shadow',
		transitionDuration: '--set-dialog-transition-duration',
	},

	// Element-scoped tokens declared on `table` itself.
	table: {
		color: '--set-table-color',
		backgroundColor: '--set-table-background-color',
		borderColor: '--set-table-border-color',
		borderWidth: '--set-table-border-width',
		fontSize: '--set-table-font-size',
		lineHeight: '--set-table-line-height',
		transitionDuration: '--set-table-transition-duration',
		cell: {
			paddingInline: '--set-table-cell-padding-inline',
			paddingBlock: '--set-table-cell-padding-block',
		},
		header: {
			fontWeight: '--set-table-header-font-weight',
			backgroundColor: '--set-table-header-background-color',
		},
		row: {
			hover: { backgroundColor: '--set-table-row-hover-background-color' },
		},
	},

	// Surface tokens — declared on :root for ::backdrop (top-layer pseudo).
	backdrop: {
		backgroundColor: '--set-backdrop-background-color',
		backdropFilter: '--set-backdrop-backdrop-filter',
		transitionDuration: '--set-backdrop-transition-duration',
	},
} as const
