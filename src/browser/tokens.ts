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
	// Surface / text / border tokens declared in `:root` next to the variants
	// (outside `@theme` so we can dual-resolve them via the `[data-theme]`
	// attribute selector — see _theme.scss for why).
	color: {
		primary: '--color-primary',
		secondary: '--color-secondary',
		tertiary: '--color-tertiary',
		success: '--color-success',
		warning: '--color-warning',
		danger: '--color-danger',
		information: '--color-information',
		canvas: '--color-canvas',
		surface: '--color-surface',
		surfaceRaised: '--color-surface-raised',
		text: '--color-text',
		textStrong: '--color-text-strong',
		textMuted: '--color-text-muted',
		textSubtle: '--color-text-subtle',
		border: '--color-border',
		borderStrong: '--color-border-strong',
		borderSubtle: '--color-border-subtle',
		// Inverted surface tier — canvas-opposite color used by always-distinct
		// chrome (tooltips, hint popovers, inverted callouts). Flips with
		// `data-theme` so the inversion stays visually distinct against the
		// active canvas in both light and dark modes.
		inverted: '--color-inverted',
		invertedText: '--color-inverted-text',
		// Variant subtle scale — tinted backgrounds, saturated text, and
		// medium-strength borders derived from the seven variants.
		// Mirrors mailbox's `--bs-{color}-bg-subtle` /
		// `--bs-{color}-text-emphasis` / `--bs-{color}-border-subtle`
		// triplets — every theme-aware component (toast, alert, banner,
		// chip, …) reads through these so a consumer who retunes a
		// variant identity gets the matching subtle/emphasis chrome
		// without a follow-up edit per partial.
		primaryBgSubtle: '--color-primary-bg-subtle',
		primaryTextEmphasis: '--color-primary-text-emphasis',
		primaryBorderSubtle: '--color-primary-border-subtle',
		secondaryBgSubtle: '--color-secondary-bg-subtle',
		secondaryTextEmphasis: '--color-secondary-text-emphasis',
		secondaryBorderSubtle: '--color-secondary-border-subtle',
		tertiaryBgSubtle: '--color-tertiary-bg-subtle',
		tertiaryTextEmphasis: '--color-tertiary-text-emphasis',
		tertiaryBorderSubtle: '--color-tertiary-border-subtle',
		successBgSubtle: '--color-success-bg-subtle',
		successTextEmphasis: '--color-success-text-emphasis',
		successBorderSubtle: '--color-success-border-subtle',
		warningBgSubtle: '--color-warning-bg-subtle',
		warningTextEmphasis: '--color-warning-text-emphasis',
		warningBorderSubtle: '--color-warning-border-subtle',
		dangerBgSubtle: '--color-danger-bg-subtle',
		dangerTextEmphasis: '--color-danger-text-emphasis',
		dangerBorderSubtle: '--color-danger-border-subtle',
		informationBgSubtle: '--color-information-bg-subtle',
		informationTextEmphasis: '--color-information-text-emphasis',
		informationBorderSubtle: '--color-information-border-subtle',

		// Variant on-canvas scale — single-token tier for variant text painted
		// directly on `--color-canvas` (no tinted container). Tuned per-mode
		// in `_theme.scss` via `color-mix()` so the same token clears WCAG
		// AA in both light (canvas = white) and dark (canvas = slate-950)
		// without per-host overrides. Consumed by bare variant anchors
		// (`_a.scss`) and any future inline variant text element. Naming
		// follows Material Design's `on-X` convention — the suffix names
		// the SURFACE the color is safe ON.
		primaryOnCanvas: '--color-primary-on-canvas',
		secondaryOnCanvas: '--color-secondary-on-canvas',
		tertiaryOnCanvas: '--color-tertiary-on-canvas',
		successOnCanvas: '--color-success-on-canvas',
		warningOnCanvas: '--color-warning-on-canvas',
		dangerOnCanvas: '--color-danger-on-canvas',
		informationOnCanvas: '--color-information-on-canvas',

		// Tailwind palette steps re-pinned to guarantee emission. Tailwind v4
		// tree-shakes palette tokens that aren't referenced by an emitted
		// utility class — these four `-700` steps power the framework's
		// success / warning / information / danger variants but have no
		// utility-class consumer, so we declare them explicitly in
		// `@theme` (see `_theme.scss`). Mirrored here so the parity test
		// stays green.
		green700: '--color-green-700',
		amber700: '--color-amber-700',
		sky700: '--color-sky-700',
		red700: '--color-red-700',
	},

	// Framework defaults that have no Tailwind equivalent.
	transitionDuration: '--set-transition-duration',

	// Framework-wide motion contract — shared between body-shell rail
	// drawers (`<nav>` / `<aside>` on mobile), `<aside popover>`
	// offcanvas drawers, `<dialog>` modals, `<details>::details-content`
	// disclosure animations, and `tr.expansion .expansion-panel` table
	// row reveals. Single duration + timing-function so substantial
	// motion feels uniform across the whole framework. See
	// `_tokens.scss` § Framework-wide motion contract for the curve
	// rationale.
	motionDuration: '--set-motion-duration',
	motionTimingFunction: '--set-motion-timing-function',
	motionSlideDistance: '--set-motion-slide-distance',

	// Baseline hydration — non-color defaults so a bare element renders
	// with consistent border-radius, gap, sticky offset, and z-index
	// layering without per-component overrides. See `_tokens.scss` for
	// design rationale.
	borderRadius: '--set-border-radius',
	borderWidth: '--set-border-width',
	gap: '--set-gap',
	stackSpacing: '--set-stack-spacing',
	stickyOffset: '--set-sticky-offset',

	// Z-index scale for floating chrome. Native popovers + `<dialog>:modal`
	// use the browser top layer (z-index inert there), but in-flow surfaces,
	// non-popover dropdowns, and consumer-authored chrome consume these
	// tokens for predictable layering against the framework's own surfaces.
	zIndex: {
		sticky: '--set-z-index-sticky',
		fixed: '--set-z-index-fixed',
		dropdown: '--set-z-index-dropdown',
		modal: '--set-z-index-modal',
		popover: '--set-z-index-popover',
		tooltip: '--set-z-index-tooltip',
		toast: '--set-z-index-toast',
	},

	// Density + radius factors — global multipliers consumers can set at
	// `:root` to retune the framework's spacing rhythm and corner
	// roundness without touching any per-component tokens. Mirrors
	// mailbox's `--bs-density-factor` and `--bs-radius-factor`.
	densityFactor: '--set-density-factor',
	radiusFactor: '--set-radius-factor',

	// Elevation scale — three distinct "lift" levels for floating surfaces
	// (popovers, toasts, dialogs, drawers). Tier names spell out
	// (`small` / `base` / `large`) to match the framework's
	// no-abbreviations naming rule (AGENTS.md §21, see also
	// `FORBIDDEN_TOKEN_SEGMENTS` in `taxonomy.ts`).
	boxShadow: {
		small: '--set-box-shadow-small',
		base: '--set-box-shadow',
		large: '--set-box-shadow-large',
	},

	// Focus ring sub-tokens.
	focus: {
		boxShadowWidth: '--set-focus-box-shadow-width',
		boxShadowOpacity: '--set-focus-box-shadow-opacity',
		// Ring tint — declared by `surfaces/_focus.scss`. Defaults to the
		// active variant background-color (so a focused `.danger` element
		// rings danger-red), with `--color-primary` as the neutral fallback.
		color: '--set-focus-color',
	},

	// Icon tokens — single overridable inline-SVG library for every chrome
	// glyph the framework paints (chevrons, check / dash / radio dots,
	// switch thumb, breadcrumb separator, sort indicator, status icons,
	// …). Consumer partials reference these through per-element aliases
	// (`--set-select-background-image`, `--set-summary-marker-image`,
	// `--set-nav-breadcrumb-separator-image`, …) so a host-page override
	// at `:root` scope retunes every consumer at once. Defaults are 16×16
	// viewBox inline data URLs at `stroke-width='2'` with
	// `stroke='currentColor'` (or `fill='currentColor'` for filled
	// glyphs), suitable for either `background-image` or `mask-image`
	// usage. See `_tokens.scss` for the full design rationale.
	icon: {
		chevronDown: '--set-icon-chevron-down',
		chevronUp: '--set-icon-chevron-up',
		chevronLeft: '--set-icon-chevron-left',
		chevronRight: '--set-icon-chevron-right',
		caretDown: '--set-icon-caret-down',
		caretUp: '--set-icon-caret-up',
		check: '--set-icon-check',
		dash: '--set-icon-dash',
		radio: '--set-icon-radio',
		switchOff: '--set-icon-switch-off',
		switchOn: '--set-icon-switch-on',
		close: '--set-icon-close',
		menu: '--set-icon-menu',
		more: '--set-icon-more',
		search: '--set-icon-search',
		filter: '--set-icon-filter',
		sort: '--set-icon-sort',
		external: '--set-icon-external',
		sun: '--set-icon-sun',
		moon: '--set-icon-moon',
		system: '--set-icon-system',
		information: '--set-icon-information',
		success: '--set-icon-success',
		warning: '--set-icon-warning',
		danger: '--set-icon-danger',
		plus: '--set-icon-plus',
		minus: '--set-icon-minus',
	},

	// Floater viewport budget — single source of truth for how a top-layer
	// floating panel (popover, tooltip, toast, dropdown, drawer) respects
	// the viewport edge on every form factor. The `mixins.floater-*` mixins
	// consume these through `var()` chains, so a host-page retune at
	// `:root` scope retunes every floater consumer at once.
	floater: {
		gutter: '--set-floater-gutter',
		insetTop: '--set-floater-inset-top',
		insetBottom: '--set-floater-inset-bottom',
		insetStart: '--set-floater-inset-start',
		insetEnd: '--set-floater-inset-end',
		maxInlineSize: '--set-floater-max-inline-size',
		maxBlockSize: '--set-floater-max-block-size',
	},

	// Variant context — set by .primary / .secondary / … modifier classes.
	// Two tiers per variant; names mirror each other with a `-subtle-` infix:
	//   FILLED tier — color / background-color / border-color / border-width.
	//     Saturated identity surface; consumed by `.filled` style and bare
	//     element variants.
	//   SUBTLE tier — subtle-color / subtle-background-color / subtle-border-color.
	//     Consumed by `.subtle` style. Tier values resolve from per-mode
	//     theme tokens (`--color-{variant}-{text-emphasis, bg-subtle,
	//     border-subtle}` — Bootstrap idiom retained on the theme tier) in
	//     `_theme.scss` so light + dark both clear AA.
	variant: {
		color: '--set-variant-color',
		backgroundColor: '--set-variant-background-color',
		borderColor: '--set-variant-border-color',
		borderWidth: '--set-variant-border-width',
		subtleColor: '--set-variant-subtle-color',
		subtleBackgroundColor: '--set-variant-subtle-background-color',
		subtleBorderColor: '--set-variant-subtle-border-color',
	},

	// Size context — set by .small / .large.
	size: {
		paddingInline: '--set-size-padding-inline',
		paddingBlock: '--set-size-padding-block',
		fontSize: '--set-size-font-size',
		borderRadius: '--set-size-border-radius',
	},

	// Style context — set by .subtle / .filled.
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
		// Dropdown-trigger caret — opt-in via `<button class="dropdown"
		// popovertarget="…">`. See `elements/_button.scss` § Dropdown-
		// trigger caret. Distinct from drawer / dialog / tooltip
		// triggers, which don't carry a caret affordance.
		dropdownCaretImage: '--set-button-dropdown-caret-image',
		dropdownCaretSize: '--set-button-dropdown-caret-size',
		dropdownCaretOpacity: '--set-button-dropdown-caret-opacity',
		dropdownCaretOpenRotate: '--set-button-dropdown-caret-open-rotate',
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
		// Component tokens for `.select` listbox / combobox chrome
		// (`src/styles/components/_select.scss`). The `<select>` element
		// and the `.select` listbox component share the `--set-select-*`
		// namespace because they're conceptually the same widget — the
		// component is just the HTML5-element-isn't-rich-enough escape
		// hatch.
		maxInlineSize: '--set-select-max-inline-size',
		toggleMinBlockSize: '--set-select-toggle-min-block-size',
		togglePaddingInlineEnd: '--set-select-toggle-padding-inline-end',
		caretMinInlineSize: '--set-select-caret-min-inline-size',
		menuMinInlineSize: '--set-select-menu-min-inline-size',
		// `content`-value token consumed by the empty-state hint that
		// paints when a typeahead filter rejects every option (see
		// `composables/_select.scss` § "Empty-state hint"). Quote-wrapped
		// at the declaration site so `content: var(...)` resolves to a
		// valid string. Consumers localise via `:root { --set-select-empty-
		// text: '"Aucun résultat"' }` — note the nested-quote shape.
		emptyText: '--set-select-empty-text',
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
		gap: '--set-fieldset-gap',
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
		// Trailing margin applied when the parent <details> is open — pushes
		// the disclosure body away from the summary. See _summary.scss for
		// the margin-vs-padding rationale.
		marginBlockEnd: '--set-summary-margin-block-end',
	},

	// Element-scoped tokens declared on `address` itself. Ported from mailbox's
	// `<address>` — small contact-info block (byline / signature / contact
	// details for the nearest sectioning ancestor). Subdued color + smaller
	// font so the block reads as metadata, not paragraph text.
	address: {
		color: '--set-address-color',
		fontSize: '--set-address-font-size',
		lineHeight: '--set-address-line-height',
		marginBlockEnd: '--set-address-margin-block-end',
	},

	// Element-scoped tokens declared on `mark` itself. Mailbox's reboot adds
	// padding + rounded corners around the highlight so the tinted background
	// reads as a chip rather than a flat backsplash.
	mark: {
		color: '--set-mark-color',
		backgroundColor: '--set-mark-background-color',
		paddingInline: '--set-mark-padding-inline',
		paddingBlock: '--set-mark-padding-block',
		borderRadius: '--set-mark-border-radius',
	},

	// Element-scoped tokens declared on `small` itself. Restores Tailwind
	// preflight's collapse-to-inherit by re-asserting Bootstrap / mailbox's
	// `--bs-relative-font-size-sm` (0.875em).
	small: {
		fontSize: '--set-small-font-size',
	},

	// Element-scoped tokens declared on `strong` itself. The variant cascade
	// reaches text-strong + 700 weight so emphasized terms pop slightly
	// against muted body copy without per-call utilities.
	strong: {
		color: '--set-strong-color',
		fontWeight: '--set-strong-font-weight',
	},

	// Component tokens declared on `.badge` (class-based — no semantic root for
	// "inline pill"). Lives in components/_badge.scss.
	badge: {
		color: '--set-badge-color',
		backgroundColor: '--set-badge-background-color',
		borderRadius: '--set-badge-border-radius',
		paddingInline: '--set-badge-padding-inline',
		paddingBlock: '--set-badge-padding-block',
		fontSize: '--set-badge-font-size',
		fontWeight: '--set-badge-font-weight',
		lineHeight: '--set-badge-line-height',
	},

	// Component tokens declared on `.dot` (class-based — no semantic root for
	// "colored circle"). Lives in components/_dot.scss.
	dot: {
		size: '--set-dot-size',
		backgroundColor: '--set-dot-background-color',
		pulseDuration: '--set-dot-pulse-duration',
		pulseEasing: '--set-dot-pulse-easing',
	},

	// Component tokens declared on `.tag` (class-based — chip-shape inline
	// label). Lives in components/_tag.scss.
	tag: {
		color: '--set-tag-color',
		backgroundColor: '--set-tag-background-color',
		borderColor: '--set-tag-border-color',
		borderWidth: '--set-tag-border-width',
		borderRadius: '--set-tag-border-radius',
		paddingInline: '--set-tag-padding-inline',
		paddingBlock: '--set-tag-padding-block',
		fontSize: '--set-tag-font-size',
		fontWeight: '--set-tag-font-weight',
		lineHeight: '--set-tag-line-height',
		gap: '--set-tag-gap',
		transitionDuration: '--set-tag-transition-duration',
	},

	// Component tokens declared on `.spinner` (class-based — `<span
	// role="status">` carrier). Lives in components/_spinner.scss.
	spinner: {
		size: '--set-spinner-size',
		borderWidth: '--set-spinner-border-width',
		color: '--set-spinner-color',
		duration: '--set-spinner-duration',
	},

	// Component tokens declared on `.skeleton` (class-based — loading
	// placeholder). Lives in components/_skeleton.scss.
	skeleton: {
		backgroundColor: '--set-skeleton-background-color',
		highlightColor: '--set-skeleton-highlight-color',
		borderRadius: '--set-skeleton-border-radius',
		duration: '--set-skeleton-duration',
		lineBlockSize: '--set-skeleton-line-block-size',
		lineGap: '--set-skeleton-line-gap',
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
		transitionDuration: '--set-meter-transition-duration',
	},

	// Component tokens declared on `.carousel` (component partial).
	carousel: {
		blockSize: '--set-carousel-block-size',
		padding: '--set-carousel-padding',
		borderColor: '--set-carousel-border-color',
		borderRadius: '--set-carousel-border-radius',
		transitionDuration: '--set-carousel-transition-duration',
		transitionEasing: '--set-carousel-transition-easing',
		controlSize: '--set-carousel-control-size',
		controlBackgroundColor: '--set-carousel-control-background-color',
		controlIcon: '--set-carousel-control-icon',
		indicatorSize: '--set-carousel-indicator-size',
		indicatorActiveSize: '--set-carousel-indicator-active-size',
		indicatorBackgroundColor: '--set-carousel-indicator-background-color',
		indicatorBackgroundColorActive: '--set-carousel-indicator-background-color-active',
	},

	// Element-scoped tokens declared on `output` itself.
	output: {
		color: '--set-output-color',
		backgroundColor: '--set-output-background-color',
		borderColor: '--set-output-border-color',
		borderWidth: '--set-output-border-width',
		borderRadius: '--set-output-border-radius',
		paddingInline: '--set-output-padding-inline',
		paddingBlock: '--set-output-padding-block',
		marginInline: '--set-output-margin-inline',
		fontFamily: '--set-output-font-family',
		fontSize: '--set-output-font-size',
		fontWeight: '--set-output-font-weight',
		transitionDuration: '--set-output-transition-duration',
	},

	// Component tokens declared on `<output>` when promoted to a toast
	// (popover or standalone status banner). Lives in components/_output.scss
	// alongside the calc-chip element baseline. Edge-inset is the distance
	// from the viewport corner; placement modifiers `.start` / `.top` flip
	// the corner.
	toast: {
		color: '--set-toast-color',
		backgroundColor: '--set-toast-background-color',
		borderColor: '--set-toast-border-color',
		borderWidth: '--set-toast-border-width',
		borderRadius: '--set-toast-border-radius',
		paddingInline: '--set-toast-padding-inline',
		paddingBlock: '--set-toast-padding-block',
		gap: '--set-toast-gap',
		minInlineSize: '--set-toast-min-inline-size',
		maxInlineSize: '--set-toast-max-inline-size',
		fontSize: '--set-toast-font-size',
		edgeInset: '--set-toast-edge-inset',
		boxShadow: '--set-toast-box-shadow',
		zIndex: '--set-toast-z-index',
		// Linear stack — gap between siblings inside one container
		// without `[data-toast-stack]`. Drives the per-toast
		// `--set-toast-stack-offset` accumulation in `createToast`.
		spacing: '--set-toast-spacing',
		// Per-toast offset written inline by `createToast.stack()` —
		// declared on `:root` with a `0px` default so the parity test
		// resolves it on a bare `<output>` and `var(--set-toast-stack-
		// offset)` references in `composables/_toast.scss` always have
		// a fallback value.
		stackOffset: '--set-toast-stack-offset',
		// Per-toast deck index — 0 means the front card. Same default-
		// on-:root pattern as `stackOffset`; the factory overwrites the
		// inline value in deck mode.
		stackIndex: '--set-toast-stack-index',
		// Deck stacking tokens — consumed by the `[data-toast-stack]`
		// rule in `composables/_toast.scss`. Inert in linear mode.
		stackDepth: '--set-toast-stack-depth',
		peekHeight: '--set-toast-peek-height',
		scaleStep: '--set-toast-scale-step',
		opacityStep: '--set-toast-opacity-step',
		frontHeight: '--set-toast-front-height',
		hiddenCount: '--set-toast-hidden-count',
	},

	// Tablist + tab + tabpanel — chrome painted on `[role=tablist]` /
	// `[role=tab]` / `[role=tabpanel]` (lives in components/_nav.scss
	// alongside the breadcrumb / pagination patterns).
	tablist: {
		color: '--set-tablist-color',
		backgroundColor: '--set-tablist-background-color',
		borderColor: '--set-tablist-border-color',
		borderWidth: '--set-tablist-border-width',
		gap: '--set-tablist-gap',
		paddingInline: '--set-tablist-padding-inline',
		paddingBlock: '--set-tablist-padding-block',
		transitionDuration: '--set-tablist-transition-duration',
	},

	tab: {
		color: '--set-tab-color',
		backgroundColor: '--set-tab-background-color',
		activeColor: '--set-tab-active-color',
		activeBackgroundColor: '--set-tab-active-background-color',
		activeIndicatorSize: '--set-tab-active-indicator-size',
		paddingInline: '--set-tab-padding-inline',
		paddingBlock: '--set-tab-padding-block',
		fontSize: '--set-tab-font-size',
		fontWeight: '--set-tab-font-weight',
		transitionDuration: '--set-tab-transition-duration',
	},

	tabpanel: {
		paddingBlock: '--set-tabpanel-padding-block',
	},

	// Alert / status banner — chrome painted on `<aside role=alert>`
	// (and optionally `<aside role=status>`) inside main-flow content.
	// Lives in components/_aside.scss alongside the sidebar + callout
	// rules.
	alert: {
		color: '--set-alert-color',
		backgroundColor: '--set-alert-background-color',
		borderColor: '--set-alert-border-color',
		barWidth: '--set-alert-bar-width',
		paddingInline: '--set-alert-padding-inline',
		paddingBlock: '--set-alert-padding-block',
		gap: '--set-alert-gap',
		borderRadius: '--set-alert-border-radius',
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
		inlineSize: '--set-dialog-inline-size',
		maxInlineSize: '--set-dialog-max-inline-size',
		maxBlockSize: '--set-dialog-max-block-size',
		footerGap: '--set-dialog-footer-gap',
		// Section chrome — `<dialog> > <header>` / `<dialog> > <footer>`
		// get auto-laid-out as Bootstrap-style modal-header / modal-footer
		// bands with their own internal padding, a divider line, and a
		// consistent gap to the body. Four tokens control the band:
		// header padding-block (`--set-dialog-section-padding-block`)
		// matches the dialog's own padding for visual continuity; footer
		// padding-block (`--set-dialog-footer-padding-block`) sits a bit
		// tighter so the action row doesn't dominate; the divider color
		// follows the dialog border by default; the gap is the breathing
		// room between band and body.
		sectionPaddingBlock: '--set-dialog-section-padding-block',
		footerPaddingBlock: '--set-dialog-footer-padding-block',
		sectionBorderColor: '--set-dialog-section-border-color',
		sectionGap: '--set-dialog-section-gap',
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
		breadcrumbActiveColor: '--set-nav-breadcrumb-active-color',

		// Pagination chrome — bordered button row inside
		// `<nav aria-label="Pagination">`. See `components/_nav.scss`.
		paginationColor: '--set-nav-pagination-color',
		paginationBackgroundColor: '--set-nav-pagination-background-color',
		paginationBorderColor: '--set-nav-pagination-border-color',
		paginationBorderWidth: '--set-nav-pagination-border-width',
		paginationBorderRadius: '--set-nav-pagination-border-radius',
		paginationPaddingInline: '--set-nav-pagination-padding-inline',
		paginationPaddingBlock: '--set-nav-pagination-padding-block',
		paginationMinSize: '--set-nav-pagination-min-size',
		paginationHoverBackgroundColor: '--set-nav-pagination-hover-background-color',
		paginationActiveColor: '--set-nav-pagination-active-color',
		paginationActiveBackgroundColor: '--set-nav-pagination-active-background-color',
		paginationActiveBorderColor: '--set-nav-pagination-active-border-color',
		paginationDisabledOpacity: '--set-nav-pagination-disabled-opacity',
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
		rowGap: '--set-form-row-gap',
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
		gap: '--set-aside-gap',
		fontSize: '--set-aside-font-size',
		lineHeight: '--set-aside-line-height',
		transitionDuration: '--set-aside-transition-duration',
		// Drawer / offcanvas sub-surface — `aside[popover]` viewport-edge
		// slide-in panel. Tokens scope per-drawer geometry + internal
		// region padding without leaking into the bare-aside (sidebar /
		// callout / alert) surface.
		drawerInlineSize: '--set-aside-drawer-inline-size',
		drawerBlockSize: '--set-aside-drawer-block-size',
		drawerZIndex: '--set-aside-drawer-z-index',
		drawerPaddingInline: '--set-aside-drawer-padding-inline',
		drawerPaddingBlock: '--set-aside-drawer-padding-block',
		drawerBandGap: '--set-aside-drawer-band-gap',
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

	// Component tokens declared on `body:has(main)` — the application layout
	// shell. The framework's body-grid promotes <nav> / <main> / <aside>
	// children into a 3×3 template-area grid; below the 960px breakpoint
	// (hardcoded — CSS @media doesn't accept var() conditions), the rails
	// detach from the grid and become fixed off-canvas drawers driven by a
	// `[data-open]` attribute on the rail element. The tokens below let
	// consumers retune the drawer dimensions + slide-in timing without
	// touching the framework's `_body.scss`.
	body: {
		railWidth: '--set-body-rail-width',
	},

	// Element-scoped tokens declared on bare `<main>` (sectioning content
	// container). Hydrated padding gutters + flex-column rhythm so a bare
	// main on a doc page or inside the body grid ships with consistent
	// spacing for its top-level children.
	main: {
		color: '--set-main-color',
		backgroundColor: '--set-main-background-color',
		paddingInline: '--set-main-padding-inline',
		paddingBlock: '--set-main-padding-block',
		gap: '--set-main-gap',
	},

	// Element-scoped tokens declared on bare `<section>` (thematic
	// grouping). Vertical padding + flex-column gap give nested sectioning
	// content predictable rhythm; `scroll-margin` clears any sticky header.
	section: {
		paddingBlock: '--set-section-padding-block',
		gap: '--set-section-gap',
		scrollMargin: '--set-section-scroll-margin',
	},

	// Element-scoped tokens declared on `<hgroup>` (heading + tagline).
	// Tight stack with a subdued tagline so metadata reads as secondary.
	hgroup: {
		gap: '--set-hgroup-gap',
		tagline: {
			color: '--set-hgroup-tagline-color',
			fontSize: '--set-hgroup-tagline-font-size',
		},
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
			paddingInlineSmall: '--set-table-cell-padding-inline-small',
			paddingBlockSmall: '--set-table-cell-padding-block-small',
		},
		header: {
			fontWeight: '--set-table-header-font-weight',
			backgroundColor: '--set-table-header-background-color',
		},
		row: {
			hover: { backgroundColor: '--set-table-row-hover-background-color' },
			striped: { backgroundColor: '--set-table-row-striped-background-color' },
			active: { backgroundColor: '--set-table-row-active-background-color' },
			selected: { backgroundColor: '--set-table-row-selected-background-color' },
		},
		sort: {
			indicator: {
				color: '--set-table-sort-indicator-color',
				opacity: '--set-table-sort-indicator-opacity',
				active: { opacity: '--set-table-sort-indicator-active-opacity' },
			},
		},
		divider: { width: '--set-table-divider-width' },
		expansion: {
			icon: '--set-table-expansion-icon',
			iconSize: '--set-table-expansion-icon-size',
			iconGap: '--set-table-expansion-icon-gap',
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
		marginBlockEnd: '--set-blockquote-margin-block-end',
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
		paddingBlock: '--set-var-padding-block',
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

	// Element-scoped tokens declared on `<data>` (machine-readable value
	// annotation). Numeric labels align in tabular-nums by default; consumers
	// override per element when proportional digits are needed.
	data: {
		fontVariantNumeric: '--set-data-font-variant-numeric',
	},

	// Element-scoped tokens declared on `<time>` (date / time annotation).
	// Same tabular-nums default as `<data>` so columns of times line up
	// vertically without per-call utilities.
	time: {
		fontVariantNumeric: '--set-time-font-variant-numeric',
	},

	// Element-scoped tokens declared on `<u>` (unarticulated annotation).
	// Disambiguated from a hyperlink via a muted dashed underline so the
	// annotation reads as labelled rather than linked.
	u: {
		textDecorationColor: '--set-u-text-decoration-color',
		textDecorationStyle: '--set-u-text-decoration-style',
	},

	// Element-scoped tokens declared on `<math>` (MathML formula). Math-aware
	// font-family chain so consumers without STIX / Latin Modern Math
	// installed still get correct operator / symbol glyphs out of the box.
	math: {
		fontFamily: '--set-math-font-family',
	},

	video: {
		maxInlineSize: '--set-video-max-inline-size',
		borderRadius: '--set-video-border-radius',
		backgroundColor: '--set-video-background-color',
	},

	audio: {
		inlineSize: '--set-audio-inline-size',
	},

	// Element-scoped tokens declared on `<canvas>` (bitmap surface). Caps
	// the rendered inline size to the container — same overflow-bound treatment
	// as <img> / <iframe> / <embed> / <object>. The internal pixel grid still
	// comes from the `width` / `height` HTML attributes (set both for HiDPI).
	canvas: {
		maxInlineSize: '--set-canvas-max-inline-size',
		blockSize: '--set-canvas-block-size',
	},

	// Element-scoped tokens declared on `<svg>` (inline SVG). Same overflow
	// treatment as `<canvas>` / `<img>` so authored viewBox-only SVGs respect
	// their container width and preserve aspect ratio.
	svg: {
		maxInlineSize: '--set-svg-max-inline-size',
		blockSize: '--set-svg-block-size',
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
		maxInlineSize: '--set-popover-max-inline-size',
		// Symmetric viewport inset used in the surface's `max-inline-size`
		// clamp: `min(target, anchor-max, 100vw - viewport-inset * 2)`.
		// Defaults to `1rem` so popovers never touch the screen edges on
		// narrow viewports. Drawer surface lifts it to `0` so the panel
		// reaches the viewport edge.
		viewportInset: '--set-popover-viewport-inset',
		// Tooltip variant — `[popover=hint]` / `[role=tooltip]`. Smaller,
		// inverted, less-padded subset of the popover surface.
		hint: {
			color: '--set-popover-hint-color',
			backgroundColor: '--set-popover-hint-background-color',
			borderColor: '--set-popover-hint-border-color',
			paddingInline: '--set-popover-hint-padding-inline',
			paddingBlock: '--set-popover-hint-padding-block',
			fontSize: '--set-popover-hint-font-size',
			maxInlineSize: '--set-popover-hint-max-inline-size',
			maxBlockSize: '--set-popover-hint-max-block-size',
			boxShadow: '--set-popover-hint-box-shadow',
		},
	},

	// Surface tokens — `::placeholder` text in form controls. Owned by
	// `surfaces/_placeholder.scss`; `<input>` / `<textarea>` no longer
	// declare per-element placeholder rules — the surface paints once for
	// every form control.
	placeholder: {
		color: '--set-placeholder-color',
		opacity: '--set-placeholder-opacity',
	},

	// Surface tokens — `::marker` for list items. Owned by
	// `surfaces/_marker.scss`. `<summary>` paints its own custom marker
	// via mask-image and is intentionally outside this surface's reach.
	marker: {
		color: '--set-marker-color',
		content: '--set-marker-content',
	},

	// Surface tokens — `::selection` highlighted text. Owned by
	// `surfaces/_selection.scss`. Background tracks the active variant
	// context with a reduced-alpha mix so the highlighted text stays
	// legible.
	selection: {
		color: '--set-selection-color',
		backgroundColor: '--set-selection-background-color',
	},

	// Surface tokens — UA scrollbar styling.
	scrollbar: {
		thumbColor: '--set-scrollbar-thumb-color',
		trackColor: '--set-scrollbar-track-color',
		width: '--set-scrollbar-width',
		gutter: '--set-scrollbar-gutter',
	},

	// Surface tokens — `::view-transition-*` cross-page / cross-state
	// snapshot tween. Owned by `surfaces/_view-transition.scss`. The default
	// cross-fade animation runs on `::view-transition-{old,new}(root)`;
	// per-name overrides (`::view-transition-old(card-3)`) live at the call
	// site and beat the default on specificity.
	viewTransition: {
		duration: '--set-view-transition-duration',
		timingFunction: '--set-view-transition-timing-function',
	},

	// Surface tokens — CSS anchor positioning. The defaults here flow into
	// every popover (auto / hint variants); placement modifiers (.top /
	// .bottom / .start / .end / corners) override `--set-anchor-position-area`
	// per-host. Manual popovers are excluded by selector — see
	// surfaces/_anchor-position.scss for the rationale.
	anchor: {
		gap: '--set-anchor-gap',
		positionTryFallbacks: '--set-anchor-position-try-fallbacks',
		positionTryOrder: '--set-anchor-position-try-order',
		positionArea: '--set-anchor-position-area',
		viewportInset: '--set-anchor-viewport-inset',
		maxBlockSize: '--set-anchor-max-block-size',
		maxInlineSize: '--set-anchor-max-inline-size',
	},
} as const
