// ============================================================================
// Token Registry — CSS custom property names for every design token.
//
// Use these constants instead of bare strings when reading or writing tokens
// from JavaScript, so rename refactors propagate and typos surface at build time.
//
// Usage:
//   const value = getComputedStyle(el).getPropertyValue(tokens.color.primary)
//   el.style.setProperty(tokens.color.primary, '200 100% 50%')
// ============================================================================

export const tokens = {
	// Color — HSL triplets (no `hsl()` wrapper; compose alpha with hsl(var(...) / 0.5))
	color: {
		primary: '--primary-hsl',
		secondary: '--secondary-hsl',
		success: '--success-hsl',
		danger: '--danger-hsl',
		warning: '--warning-hsl',
		info: '--info-hsl',
		light: '--light-hsl',
		dark: '--dark-hsl',
	},

	// Foreground — text color that pairs with each semantic background
	foreground: {
		primary: '--primary-foreground',
		secondary: '--secondary-foreground',
		success: '--success-foreground',
		danger: '--danger-foreground',
		warning: '--warning-foreground',
		info: '--info-foreground',
		light: '--light-foreground',
		dark: '--dark-foreground',
	},

	// Body / surface defaults
	body: {
		color: '--body-color',
		background: '--body-background',
		muted: '--muted-color',
	},

	// Links
	link: {
		color: '--link-color',
		hover: '--link-hover-color',
	},

	// Typography
	font: {
		sans: '--font-sans',
		mono: '--font-mono',
		size: '--font-size',
		small: '--font-size-sm',
		large: '--font-size-lg',
		weight: '--font-weight',
		semibold: '--font-weight-semibold',
		bold: '--font-weight-bold',
		height: '--line-height',
	},

	// Spacing scale
	space: {
		base: '--space',
		xs: '--space-xs',
		sm: '--space-sm',
		md: '--space-md',
		lg: '--space-lg',
		xl: '--space-xl',
	},

	// Border
	border: {
		radius: '--radius',
		radiusSm: '--radius-sm',
		radiusLg: '--radius-lg',
		radiusPill: '--radius-pill',
		width: '--border-width',
		color: '--border-color',
	},

	// Focus ring
	focus: {
		width: '--focus-width',
		opacity: '--focus-opacity',
	},

	// Shadows
	shadow: {
		sm: '--shadow-sm',
		base: '--shadow',
		lg: '--shadow-lg',
	},

	// Transition
	transition: {
		duration: '--duration',
		slow: '--duration-slow',
		easing: '--easing',
	},

	// Button component tokens (set on the button element; overridden by modifiers)
	button: {
		color: '--button-color',
		background: '--button-background',
		border: '--button-border-color',
		width: '--button-border-width',
		radius: '--button-radius',
		size: '--button-font-size',
		weight: '--button-font-weight',
		height: '--button-line-height',
		duration: '--button-duration',
		padding: {
			x: '--button-padding-x',
			y: '--button-padding-y',
		},
		hover: {
			color: '--button-hover-color',
			background: '--button-hover-background',
			border: '--button-hover-border-color',
		},
		active: {
			color: '--button-active-color',
			background: '--button-active-background',
			border: '--button-active-border-color',
		},
		disabled: {
			opacity: '--button-disabled-opacity',
		},
		focus: {
			shadow: '--button-focus-shadow',
		},
	},
} as const

