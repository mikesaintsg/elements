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
		// Chevron asset — defaults to an inline SVG data URL. Override to swap
		// the chevron (color, shape, asset) or set to `none` to remove it.
		backgroundImage: '--set-select-background-image',
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

	// Element-scoped tokens declared on `label` itself.
	label: {
		color: '--set-label-color',
		fontSize: '--set-label-font-size',
		fontWeight: '--set-label-font-weight',
		lineHeight: '--set-label-line-height',
		cursor: '--set-label-cursor',
		transitionDuration: '--set-label-transition-duration',
		disabled: { opacity: '--set-label-disabled-opacity' },
	},

	// Element-scoped tokens declared on `fieldset` itself.
	fieldset: {
		color: '--set-fieldset-color',
		backgroundColor: '--set-fieldset-background-color',
		borderColor: '--set-fieldset-border-color',
		borderWidth: '--set-fieldset-border-width',
		borderRadius: '--set-fieldset-border-radius',
		paddingInline: '--set-fieldset-padding-inline',
		paddingBlock: '--set-fieldset-padding-block',
		transitionDuration: '--set-fieldset-transition-duration',
		disabled: { opacity: '--set-fieldset-disabled-opacity' },
	},

	// Element-scoped tokens declared on `legend` itself.
	legend: {
		color: '--set-legend-color',
		fontSize: '--set-legend-font-size',
		fontWeight: '--set-legend-font-weight',
		paddingInline: '--set-legend-padding-inline',
	},

	// Element-scoped tokens declared on `details` itself.
	details: {
		color: '--set-details-color',
		backgroundColor: '--set-details-background-color',
		borderColor: '--set-details-border-color',
		borderWidth: '--set-details-border-width',
		borderRadius: '--set-details-border-radius',
		paddingInline: '--set-details-padding-inline',
		paddingBlock: '--set-details-padding-block',
		transitionDuration: '--set-details-transition-duration',
	},

	// Element-scoped tokens declared on `summary` itself.
	summary: {
		color: '--set-summary-color',
		fontSize: '--set-summary-font-size',
		fontWeight: '--set-summary-font-weight',
		cursor: '--set-summary-cursor',
		markerSize: '--set-summary-marker-size',
		markerGap: '--set-summary-marker-gap',
		// Marker glyph asset — defaults to an inline SVG chevron data URL.
		// Override to swap a different chevron, plus-sign, or custom icon.
		markerImage: '--set-summary-marker-image',
		markerOpenRotate: '--set-summary-marker-open-rotate',
		transitionDuration: '--set-summary-transition-duration',
	},

	// Element-scoped tokens declared on `progress` itself.
	progress: {
		blockSize: '--set-progress-block-size',
		borderRadius: '--set-progress-border-radius',
		trackColor: '--set-progress-track-color',
		fillColor: '--set-progress-fill-color',
		transitionDuration: '--set-progress-transition-duration',
	},

	// Element-scoped tokens declared on `meter` itself. Three fill colors
	// map to the UA's optimum / sub-optimum / even-less-good classifications.
	meter: {
		blockSize: '--set-meter-block-size',
		borderRadius: '--set-meter-border-radius',
		trackColor: '--set-meter-track-color',
		optimumColor: '--set-meter-optimum-color',
		suboptimumColor: '--set-meter-suboptimum-color',
		evenLessGoodColor: '--set-meter-even-less-good-color',
	},

	// Element-scoped tokens declared on `output` itself.
	output: {
		color: '--set-output-color',
		backgroundColor: '--set-output-background-color',
		borderRadius: '--set-output-border-radius',
		paddingInline: '--set-output-padding-inline',
		paddingBlock: '--set-output-padding-block',
		fontFamily: '--set-output-font-family',
		fontSize: '--set-output-font-size',
		transitionDuration: '--set-output-transition-duration',
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

	// Component tokens declared on bare `<nav>`. Body-shell rail chrome
	// (sidebar/rail) consumes them; the breadcrumb / generic-row variants
	// pick up gap + font-size only.
	nav: {
		color: '--set-nav-color',
		backgroundColor: '--set-nav-background-color',
		borderColor: '--set-nav-border-color',
		borderWidth: '--set-nav-border-width',
		paddingInline: '--set-nav-padding-inline',
		paddingBlock: '--set-nav-padding-block',
		inlineSize: '--set-nav-inline-size',
		gap: '--set-nav-gap',
		fontSize: '--set-nav-font-size',
		lineHeight: '--set-nav-line-height',
		transitionDuration: '--set-nav-transition-duration',
		// Breadcrumb separator glyph — defaults to an inline SVG chevron data
		// URL. Override to swap a different chevron, slash, or custom glyph.
		breadcrumbSeparatorImage: '--set-nav-breadcrumb-separator-image',
		breadcrumbSeparatorSize: '--set-nav-breadcrumb-separator-size',
		breadcrumbSeparatorOpacity: '--set-nav-breadcrumb-separator-opacity',
	},

	// Component tokens declared on bare `<search>` (search bar).
	search: {
		color: '--set-search-color',
		backgroundColor: '--set-search-background-color',
		paddingInline: '--set-search-padding-inline',
		paddingBlock: '--set-search-padding-block',
		gap: '--set-search-gap',
		transitionDuration: '--set-search-transition-duration',
	},

	// Component tokens declared on bare `<menu>` (toolbar / action row).
	menu: {
		color: '--set-menu-color',
		backgroundColor: '--set-menu-background-color',
		gap: '--set-menu-gap',
		paddingInline: '--set-menu-padding-inline',
		paddingBlock: '--set-menu-padding-block',
		justifyContent: '--set-menu-justify-content',
		transitionDuration: '--set-menu-transition-duration',
	},

	// Component tokens declared on bare `<form>` (form stack).
	form: {
		gap: '--set-form-gap',
		inlineGap: '--set-form-inline-gap',
		labelGap: '--set-form-label-gap',
		transitionDuration: '--set-form-transition-duration',
	},

	// Component tokens declared on bare `<aside>` when it's a child of the
	// body layout shell (the framework's sidebar). The article-aside callout
	// uses a separate `--set-callout-*` namespace declared inline in
	// components/_aside.scss; not mirrored here because it's class-keyed
	// internal state, not a public override point.
	aside: {
		color: '--set-aside-color',
		backgroundColor: '--set-aside-background-color',
		borderColor: '--set-aside-border-color',
		borderWidth: '--set-aside-border-width',
		paddingInline: '--set-aside-padding-inline',
		paddingBlock: '--set-aside-padding-block',
		inlineSize: '--set-aside-inline-size',
		fontSize: '--set-aside-font-size',
		lineHeight: '--set-aside-line-height',
		transitionDuration: '--set-aside-transition-duration',
	},

	// Component tokens declared on bare `<header>` when it's a child of the
	// body layout shell (page app bar). Card-header chrome (article > header)
	// shares the article token surface and isn't mirrored here.
	header: {
		color: '--set-header-color',
		backgroundColor: '--set-header-background-color',
		borderColor: '--set-header-border-color',
		borderWidth: '--set-header-border-width',
		paddingInline: '--set-header-padding-inline',
		paddingBlock: '--set-header-padding-block',
		fontSize: '--set-header-font-size',
		lineHeight: '--set-header-line-height',
		transitionDuration: '--set-header-transition-duration',
	},

	// Component tokens declared on bare `<footer>` when it's a child of the
	// body layout shell (page footer). Card-footer chrome (article > footer)
	// shares the article token surface.
	footer: {
		color: '--set-footer-color',
		backgroundColor: '--set-footer-background-color',
		borderColor: '--set-footer-border-color',
		borderWidth: '--set-footer-border-width',
		paddingInline: '--set-footer-padding-inline',
		paddingBlock: '--set-footer-padding-block',
		fontSize: '--set-footer-font-size',
		lineHeight: '--set-footer-line-height',
		transitionDuration: '--set-footer-transition-duration',
	},

	// Component tokens declared on bare `<article>` (the framework's card).
	// Lives under components/_article.scss; the parity test scans that file
	// alongside the elements partials.
	article: {
		color: '--set-article-color',
		backgroundColor: '--set-article-background-color',
		borderColor: '--set-article-border-color',
		borderWidth: '--set-article-border-width',
		borderRadius: '--set-article-border-radius',
		paddingInline: '--set-article-padding-inline',
		paddingBlock: '--set-article-padding-block',
		gap: '--set-article-gap',
		fontSize: '--set-article-font-size',
		lineHeight: '--set-article-line-height',
		boxShadow: '--set-article-box-shadow',
		transitionDuration: '--set-article-transition-duration',
		disabled: { opacity: '--set-article-disabled-opacity' },
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

	// ── Phase 3 typographic overrides ──────────────────────────────────────

	hr: {
		color: '--set-hr-color',
		opacity: '--set-hr-opacity',
	},

	blockquote: {
		color: '--set-blockquote-color',
		barWidth: '--set-blockquote-bar-width',
		paddingInline: '--set-blockquote-padding-inline',
	},

	code: {
		color: '--set-code-color',
		backgroundColor: '--set-code-background-color',
		paddingInline: '--set-code-padding-inline',
		paddingBlock: '--set-code-padding-block',
		borderRadius: '--set-code-border-radius',
		fontSize: '--set-code-font-size',
	},

	kbd: {
		color: '--set-kbd-color',
		backgroundColor: '--set-kbd-background-color',
		borderColor: '--set-kbd-border-color',
		paddingInline: '--set-kbd-padding-inline',
		paddingBlock: '--set-kbd-padding-block',
		borderRadius: '--set-kbd-border-radius',
		fontSize: '--set-kbd-font-size',
	},

	samp: {
		color: '--set-samp-color',
		backgroundColor: '--set-samp-background-color',
		paddingInline: '--set-samp-padding-inline',
		paddingBlock: '--set-samp-padding-block',
		borderRadius: '--set-samp-border-radius',
		fontSize: '--set-samp-font-size',
	},

	var: {
		color: '--set-var-color',
		backgroundColor: '--set-var-background-color',
		paddingInline: '--set-var-padding-inline',
		borderRadius: '--set-var-border-radius',
		fontSize: '--set-var-font-size',
	},

	pre: {
		color: '--set-pre-color',
		backgroundColor: '--set-pre-background-color',
		borderColor: '--set-pre-border-color',
		paddingInline: '--set-pre-padding-inline',
		paddingBlock: '--set-pre-padding-block',
		borderRadius: '--set-pre-border-radius',
		fontSize: '--set-pre-font-size',
		lineHeight: '--set-pre-line-height',
	},

	dl: {
		rowGap: '--set-dl-row-gap',
		columnGap: '--set-dl-column-gap',
	},

	dt: {
		color: '--set-dt-color',
		fontWeight: '--set-dt-font-weight',
	},

	dd: {
		color: '--set-dd-color',
	},

	// ── Phase 4 media overrides ─────────────────────────────────────────────

	figure: {
		gap: '--set-figure-gap',
	},

	figcaption: {
		color: '--set-figcaption-color',
		fontSize: '--set-figcaption-font-size',
		lineHeight: '--set-figcaption-line-height',
	},

	video: {
		borderRadius: '--set-video-border-radius',
		backgroundColor: '--set-video-background-color',
	},

	audio: {
		inlineSize: '--set-audio-inline-size',
	},

	iframe: {
		borderWidth: '--set-iframe-border-width',
		maxInlineSize: '--set-iframe-max-inline-size',
	},

	embed: {
		maxInlineSize: '--set-embed-max-inline-size',
	},

	object: {
		maxInlineSize: '--set-object-max-inline-size',
	},

	// Surface tokens — declared on :root for ::backdrop (top-layer pseudo).
	backdrop: {
		backgroundColor: '--set-backdrop-background-color',
		backdropFilter: '--set-backdrop-backdrop-filter',
		transitionDuration: '--set-backdrop-transition-duration',
	},

	// Surface tokens — `[popover]` top-layer panel.
	popover: {
		color: '--set-popover-color',
		backgroundColor: '--set-popover-background-color',
		borderColor: '--set-popover-border-color',
		borderWidth: '--set-popover-border-width',
		borderRadius: '--set-popover-border-radius',
		paddingInline: '--set-popover-padding-inline',
		paddingBlock: '--set-popover-padding-block',
		boxShadow: '--set-popover-box-shadow',
		transitionDuration: '--set-popover-transition-duration',
	},

	// Surface tokens — UA scrollbar styling.
	scrollbar: {
		thumbColor: '--set-scrollbar-thumb-color',
		trackColor: '--set-scrollbar-track-color',
		width: '--set-scrollbar-width',
		gutter: '--set-scrollbar-gutter',
	},
} as const
