// ============================================================================
// Style-folder structural contracts.
//
// One contract per folder under `src/styles/`. Every SCSS partial in a folder
// is held to the matching contract by the parity test at
// `tests/src/styles/_contracts.test.ts`.
//
// A contract names:
//   - which cascade layer the partial's rules MUST wrap in
//   - which kinds of root selectors (the first simple selector of each rule)
//     are allowed in the folder
//   - which kinds are explicitly forbidden (and why — to point at the right
//     home in the failure message)
//   - the token-namespace policy (what `--set-*` prefixes the partial may
//     declare on its rules)
//   - whether the partial must gate on a composable-state selector
//   - whether the partial may be comment-only
//   - whether `@use '../mixins' as *;` is required for non-stub partials
//
// Contracts are tightened by adding individual FILE_EXCEPTIONS entries when
// a known-good outlier needs an opt-out. The audit identified six legitimate
// outliers (see FILE_EXCEPTIONS below); every other partial conforms.
// ============================================================================

// ── Vocabulary ──────────────────────────────────────────────────────────────

/** The five cascade layers + folders the framework owns. */
export type StyleLayer = 'elements' | 'modifiers' | 'surfaces' | 'components' | 'composables'

/**
 * The shape of the FIRST simple selector of a compound selector — the "head"
 * the cascade reads to decide which rules apply.
 *
 * Compound and descendant selectors are classified by their head:
 *   - `button.dropdown::after` → 'tag' (head is `button`, the rest is qualifier)
 *   - `body:has(main) > main` → 'tag' (head is `body`)
 *   - `[popover]:not(aside).top` → 'attribute' (head is `[popover]`)
 *   - `&.primary` (Sass nesting) → 'nested' — caller decides what to do
 */
export type SelectorKind =
	| 'tag' /* button, dialog, h1 */
	| 'class' /* .badge, .stack */
	| 'pseudo-element' /* ::backdrop, ::marker */
	| 'pseudo-class' /* :focus-visible, :popover-open */
	| 'attribute' /* [popover], [open] */
	| 'data-attribute' /* [data-toast-stack] */
	| 'aria-attribute' /* [aria-selected='true'] */
	| 'role-attribute' /* [role='tablist'] */
	| 'universal' /* * (or *::before etc.) */
	| 'root' /* :root */
	| 'nested' /* & or &-prefixed (Sass nesting) */
	| 'at-rule' /* @media / @supports / @container nested rules */
	| 'unknown' /* anything we cannot confidently classify */

/**
 * Token namespace policy — what `--set-*` prefixes a partial in a folder is
 * allowed to declare on its rule bodies. Filename-derived policies pass the
 * basename (without the `_` and `.scss`) through; "free" lets composables
 * read or override any token without restriction; "none" forbids any
 * `--set-*` declaration (used by `_states.scss` / `_placements.scss` which
 * are pure CSS-property emitters).
 */
export type TokenNamespacePolicy =
	| { readonly kind: 'filename' } /* --set-{filename}-* */
	| { readonly kind: 'dimension' } /* --set-{variant|size|style|state|placement}-* */
	| { readonly kind: 'free' } /* any --set-* permitted */
	| { readonly kind: 'none' } /* no --set-* declarations permitted */

/** Per-folder structural contract. */
export interface FolderContract {
	readonly layer: StyleLayer
	/** One-sentence description for failure messages. */
	readonly description: string
	/** Whether a partial in the folder may be comment-only (no rules). */
	readonly allowCommentOnly: boolean
	/** Whether every rule in the partial must gate on a composable-state selector. */
	readonly requireStateSelector: boolean
	/** Selector kinds permitted as the head of a rule. */
	readonly allowedHeadKinds: readonly SelectorKind[]
	/**
	 * Selector kinds forbidden as the head of a rule, with the recommended
	 * home in the failure message. Order matters — the first match wins.
	 */
	readonly forbiddenHeadKinds: ReadonlyArray<{
		readonly kind: SelectorKind
		readonly recommendation: string
	}>
	/** Token namespace policy. */
	readonly tokenNamespace: TokenNamespacePolicy
}

// ── Folder contracts ───────────────────────────────────────────────────────

export const FOLDER_CONTRACTS: Readonly<Record<StyleLayer, FolderContract>> = {
	elements: {
		layer: 'elements',
		description:
			'One partial per HTML tag. Substantive partials declare --set-{tag}-* tokens via a fallback chain (style → variant → size → element default); reset partials normalize UA defaults only; passthrough partials are comment-only stubs.',
		allowCommentOnly: true,
		requireStateSelector: false,
		allowedHeadKinds: [
			'tag',
			'root', // nested :root blocks for consumer-overridable globals (e.g. button.dropdown caret tokens)
			'nested', // &-prefixed for state pseudo-classes inside the element selector
			'at-rule',
		],
		forbiddenHeadKinds: [
			{
				kind: 'data-attribute',
				recommendation:
					'composable-state attributes ([data-{name}-*]) belong in composables/{name}.scss',
			},
			{
				kind: 'class',
				recommendation:
					'bare class rules (.foo) belong in modifiers/_{dimension}.scss or components/_{name}.scss',
			},
			{
				kind: 'pseudo-element',
				recommendation:
					'top-level pseudo-element rules belong in surfaces/ — pseudo-elements inside an element selector (button.dropdown::after, summary::before) ARE allowed because they are element-local affordances',
			},
		],
		tokenNamespace: { kind: 'filename' },
	},
	modifiers: {
		layer: 'modifiers',
		description:
			'Cross-cutting modifier classes (5 dimensions) + _local.scss for element-local modifiers. Modifiers set --set-{dimension}-* context tokens; elements consume them.',
		allowCommentOnly: false, // even _local.scss has a charter
		requireStateSelector: false,
		allowedHeadKinds: [
			'class', // bare .primary, .small, .filled, .disabled
			'attribute', // [popover]:not(aside)... in _placements.scss
			'tag', // form.row, button.dropdown in _local.scss (head is the tag, qualifier is the modifier)
			'at-rule',
		],
		forbiddenHeadKinds: [
			{
				kind: 'pseudo-element',
				recommendation: 'pseudo-element rules belong in surfaces/',
			},
			{
				kind: 'data-attribute',
				recommendation:
					'composable-state attributes belong in composables/{matching-name}.scss',
			},
		],
		tokenNamespace: { kind: 'dimension' },
	},
	surfaces: {
		layer: 'surfaces',
		description:
			'Pseudo-elements + attribute selectors. Each surface owns a --set-{surface}-* token namespace and may read tokens from sibling surfaces via var().',
		allowCommentOnly: false,
		requireStateSelector: false,
		allowedHeadKinds: [
			'pseudo-element', // ::backdrop, ::marker, ::placeholder, ::selection
			'pseudo-class', // :focus-visible
			'attribute', // [popover]
			'role-attribute', // [role='tooltip'] for the popover hint variant
			'universal', // *, *::before, *::after for scrollbar (CSS Scrollbars L1 inheritance quirk)
			'root', // :root for token defaults
			'tag', // dialog::backdrop (head is the tag, followed by the pseudo)
			'nested',
			'at-rule',
		],
		forbiddenHeadKinds: [
			{
				kind: 'class',
				recommendation:
					'bare class rules belong in components/_{name}.scss or modifiers/_{dimension}.scss',
			},
			{
				kind: 'data-attribute',
				recommendation: 'composable-state attributes belong in composables/{matching-name}.scss',
			},
		],
		tokenNamespace: { kind: 'filename' },
	},
	components: {
		layer: 'components',
		description:
			'Element compositions (article, form, nav) + class-component primitives (.badge, .dot, .tag). Substantive baselines for tags whose chrome is too rich for elements/.',
		allowCommentOnly: false,
		requireStateSelector: false,
		allowedHeadKinds: [
			'tag', // article, aside, body, footer, form, header, main, menu, nav, output, search
			'class', // .badge, .dot, .skeleton, .spinner, .tag, .stack, .cluster
			'attribute', // [popover] for menu / nav drawer
			'role-attribute', // [role='tablist'], [role='tab'], [role='tabpanel'], [role='group'], [role='toolbar']
			'pseudo-class', // :is(aside, nav) / :where(...) for selector grouping
			'root', // :root for consumer-overridable global tokens (toast edge inset, nav breadcrumb separator, etc.)
			'nested',
			'at-rule',
		],
		forbiddenHeadKinds: [
			{
				kind: 'pseudo-element',
				recommendation: 'top-level pseudo-element rules belong in surfaces/',
			},
		],
		tokenNamespace: { kind: 'filename' }, // each file owns its basename; adjacent namespaces opt in via FILE_EXCEPTIONS
	},
	composables: {
		layer: 'composables',
		description:
			'Chrome partials gated on composable state ([data-*], [aria-*=...], [role=...], [open], :popover-open, :modal, :open). Filename matches a use{Name} factory.',
		allowCommentOnly: true, // _aside.scss is intentionally chrome-free (useAside is behavior-only)
		requireStateSelector: true,
		allowedHeadKinds: [
			'tag', // dialog.scrollable[open]
			'class', // .carousel-item-next, .carousel-item-prev (lifecycle classes)
			'attribute', // [popover], [open]
			'data-attribute', // [data-toast-stack]
			'aria-attribute', // [aria-expanded='true']
			'role-attribute', // [role='tablist']
			'pseudo-class', // :popover-open
			'nested',
			'at-rule',
		],
		forbiddenHeadKinds: [
			{
				kind: 'pseudo-element',
				recommendation: 'top-level pseudo-element rules belong in surfaces/',
			},
		],
		tokenNamespace: { kind: 'free' }, // composables read/override any namespace by design
	},
}

// ── File exceptions ────────────────────────────────────────────────────────
//
// Named overrides for the small set of known-good outliers. The contract
// test consults this map before applying the default folder contract. Each
// exception names what it relaxes and why — the comment is the justification
// future authors will read.

export interface FileException {
	/** Whether the file may be comment-only despite the folder default. */
	readonly allowCommentOnly?: boolean
	/** Whether the file is exempted from the requireStateSelector rule. */
	readonly skipStateSelectorCheck?: boolean
	/** Additional token-namespace prefixes the file may declare. */
	readonly additionalTokenPrefixes?: readonly string[]
	/** Free-form note recorded in the failure message when relevant. */
	readonly note: string
}

export const FILE_EXCEPTIONS: Readonly<Record<string, FileException>> = {
	// composables/_aside.scss — useAside is a behavior-only composable (scroll
	// lock + focus trap + light dismiss); the drawer's geometry lives in
	// components/_aside.scss as the `aside[popover]` rule. This partial
	// exists as a placeholder so the composables/ inventory mirrors the
	// browser/composables/ inventory.
	'composables/_aside.scss': {
		skipStateSelectorCheck: true,
		allowCommentOnly: true,
		note: 'useAside is a behavior-only composable; chrome lives in components/_aside.scss',
	},

	// components/_aside.scss — declares three sibling namespaces because
	// `<aside>` plays three roles depending on context: page sidebar (--set-
	// aside-*), article callout (--set-callout-*), and in-flow alert (--set-
	// alert-*). The alert namespace is paired with `useAlert`; the alert
	// chrome currently lives here pending the planned move to
	// composables/_alert.scss. The drawer variant (`aside[popover]`) also
	// overrides --set-variant-*, --set-popover-*, and --set-anchor-* tokens
	// to retune the offcanvas cascade for the drawer geometry.
	'components/_aside.scss': {
		additionalTokenPrefixes: ['callout', 'alert', 'variant', 'popover', 'anchor'],
		note: '<aside> plays three roles (sidebar / callout / alert) + drawer overrides for variant/popover/anchor cascade',
	},

	// components/_output.scss — `<output popover>` becomes a toast.
	// Toast-deck geometry uses --set-toast-* in addition to the bare-output
	// --set-output-* namespace. Pairing with useToast / createToast.
	'components/_output.scss': {
		additionalTokenPrefixes: ['toast'],
		note: '<output popover> promotes to toast — useToast shares the --set-toast-* namespace',
	},

	// components/_div.scss — class-component primitives .stack and .cluster
	// share <div> as their carrier. Tokens flow under their class names, not
	// "div".
	'components/_div.scss': {
		additionalTokenPrefixes: ['stack', 'cluster'],
		note: '.stack and .cluster class-component primitives carried by <div>',
	},

	// components/_nav.scss — declares --set-tablist-* and --set-tab-* on
	// `[role='tablist']` / `[role='tab']` because the breadcrumb / pagination
	// / tabs patterns all share <nav> as their root.
	'components/_nav.scss': {
		additionalTokenPrefixes: ['tablist', 'tab', 'tabpanel'],
		note: '<nav> carries breadcrumb / pagination / tablist patterns; shared --set-tab*-* namespace',
	},

	// surfaces/_popover.scss — the tooltip variant ships --set-popover-hint-*
	// AND the file also reads cross-surface tokens from anchor-position
	// (`var(--set-anchor-max-inline-size)`). The cross-surface reads are
	// legitimate composition; the hint-namespace declaration extends the
	// surface's own prefix.
	'surfaces/_popover.scss': {
		additionalTokenPrefixes: ['popover-hint', 'anchor'],
		note: 'popover surface reads anchor tokens by design + extends with hint namespace for tooltip variant',
	},

	// elements/_h1-h6.scss — multi-tag partial. Token namespace is
	// --set-heading-* (the logical group), not per-individual-tag.
	'elements/_h1-h6.scss': {
		additionalTokenPrefixes: ['heading'],
		note: 'multi-tag partial covering h1 through h6; tokens share the --set-heading-* namespace',
	},

	// surfaces/_anchor-position.scss — file basename is `anchor-position`
	// but the surface's token namespace is `anchor` (the partial is named
	// after the CSS feature, not the namespace).
	'surfaces/_anchor-position.scss': {
		additionalTokenPrefixes: ['anchor'],
		note: 'surface named after the CSS anchor-position feature; tokens live under --set-anchor-*',
	},

	// elements/_input.scss — the `<input>` element subtypes ship dedicated
	// namespaces (--set-check-* for checkbox / radio, --set-switch-* for
	// switch role, --set-range-* for range slider). Each subtype is its own
	// micro-design surface and gets its own prefix for consumer overrides.
	'elements/_input.scss': {
		additionalTokenPrefixes: ['check', 'switch', 'range', 'color', 'file'],
		note: '<input> subtypes (checkbox / radio / switch / range / color / file) ship dedicated --set-{type}-* namespaces',
	},

	// elements/_li.scss + elements/_ul.scss — the list-group component pattern
	// (<ul class="group"> + <li class="group-item">) lives on the list
	// elements and declares its tokens under --set-group-*.
	'elements/_li.scss': {
		additionalTokenPrefixes: ['group'],
		note: '<ul class="group"> list-group component carried by <li>; tokens under --set-group-*',
	},
	'elements/_ul.scss': {
		additionalTokenPrefixes: ['group'],
		note: '<ul class="group"> list-group component carried by <ul>; tokens under --set-group-*',
	},
}

// ── Selector classification ────────────────────────────────────────────────

/**
 * State selector regex — the set of attribute / pseudo-class selectors that
 * mark a composable-managed UI state. The composables/ contract requires at
 * least one of these to appear in every rule body.
 *
 * Patterns matched:
 *   [data-{name}-*]                  framework-internal data attribute
 *   [aria-{state}='...']             ARIA state with explicit value
 *   [role='{role}']                  ARIA role promotion
 *   [popover] / [popover='...']      native popover attribute
 *   [open]                           <details> / <dialog> boolean attr
 *   :popover-open / :modal / :open   UA top-layer states
 */
export const STATE_SELECTOR_REGEX =
	/\[(?:data-[a-z][a-z0-9-]*|aria-[a-z][a-z0-9-]*=|role=|popover[\]=]|open\])|:popover-open\b|:modal\b|:open\b/

/**
 * Classify the head (first simple selector) of a compound selector. The head
 * is everything from the start up to the first whitespace, combinator
 * (`>`, `+`, `~`), or class/attribute/pseudo qualifier.
 *
 * Examples:
 *   'button'                  → 'tag'
 *   'button.dropdown::after'  → 'tag'           (button is the head)
 *   'body:has(main) > main'   → 'tag'           (body is the head)
 *   '.badge'                  → 'class'
 *   '.badge.primary'          → 'class'         (.badge is the head)
 *   '::backdrop'              → 'pseudo-element'
 *   ':root'                   → 'root'
 *   ':focus-visible'          → 'pseudo-class'
 *   '*'                       → 'universal'
 *   '[popover]'               → 'attribute'
 *   '[data-toast-stack]'      → 'data-attribute'
 *   '[aria-selected="true"]'  → 'aria-attribute'
 *   '[role="tablist"]'        → 'role-attribute'
 *   '&.primary'               → 'nested'
 *   '@media (max-width: …)'   → 'at-rule'
 */
export function classifyHeadSelector(selector: string): SelectorKind {
	const trimmed = selector.trim()
	if (trimmed.length === 0) return 'unknown'
	if (trimmed.startsWith('@')) return 'at-rule'
	if (trimmed.startsWith('&')) return 'nested'

	// Functional pseudos `:is(...)`, `:where(...)`, `:not(...)` wrap one or
	// more selector branches and visually fold into the cascade as if the
	// inner content were written directly. Peer into the parens, classify
	// the first inner branch, and return that — `:where(h1, h2)` reads as
	// 'tag', not 'pseudo-class'. Specificity differs (`:where()` is zero)
	// but the architectural classification follows the inner subject.
	if (/^:(is|where|not|has)\(/.test(trimmed)) {
		const open = trimmed.indexOf('(')
		let depth = 1
		let i = open + 1
		for (; i < trimmed.length && depth > 0; i += 1) {
			const ch = trimmed[i]
			if (ch === '(') depth += 1
			else if (ch === ')') depth -= 1
		}
		const inner = trimmed.slice(open + 1, i - 1).trim()
		const branches = inner.split(',').map((b) => b.trim()).filter((b) => b.length > 0)
		const firstBranch = branches[0] ?? inner
		if (firstBranch.length > 0) return classifyHeadSelector(firstBranch)
		return 'pseudo-class'
	}

	if (trimmed === ':root' || trimmed.startsWith(':root ') || trimmed.startsWith(':root,'))
		return 'root'
	if (trimmed.startsWith('::')) return 'pseudo-element'
	if (trimmed.startsWith(':')) return 'pseudo-class'
	if (trimmed.startsWith('[data-')) return 'data-attribute'
	if (trimmed.startsWith('[aria-')) return 'aria-attribute'
	if (trimmed.startsWith('[role')) return 'role-attribute'
	if (trimmed.startsWith('[')) return 'attribute'
	if (trimmed === '*' || trimmed.startsWith('*')) return 'universal'
	if (trimmed.startsWith('.')) return 'class'
	if (/^[a-z][a-z0-9-]*/.test(trimmed)) return 'tag'
	return 'unknown'
}

/** True when the selector contains at least one composable-state marker. */
export function hasStateSelector(selector: string): boolean {
	return STATE_SELECTOR_REGEX.test(selector)
}

/** True when the selector contains a top-level pseudo-element. */
export function hasPseudoElement(selector: string): boolean {
	return /::[a-z]/.test(selector)
}

// ── Token namespace helpers ────────────────────────────────────────────────

/**
 * Resolve the basename of a SCSS partial path (no leading `_`, no `.scss`).
 *
 *   'src/styles/elements/_button.scss' → 'button'
 *   'src/styles/components/_role-group.scss' → 'role-group'
 *   'src/styles/elements/_h1-h6.scss' → 'h1-h6'
 */
export function partialBasename(path: string): string {
	const match = path.match(/_([a-z][a-z0-9-]*)\.scss$/)
	return match?.[1] ?? ''
}

/** Resolve the folder name from a partial path. */
export function partialFolder(path: string): StyleLayer | null {
	const match = path.match(/\/styles\/([^/]+)\/_[^/]+\.scss$/)
	const folder = match?.[1]
	if (folder === undefined) return null
	if (
		folder === 'elements' ||
		folder === 'modifiers' ||
		folder === 'surfaces' ||
		folder === 'components' ||
		folder === 'composables'
	) {
		return folder
	}
	return null
}

/** Look up the file exception for a partial path, if any. */
export function exceptionFor(path: string): FileException | null {
	const match = path.match(/\/styles\/([^/]+\/_[^/]+\.scss)$/)
	const key = match?.[1]
	if (key === undefined) return null
	return FILE_EXCEPTIONS[key] ?? null
}

/**
 * Resolve the set of `--set-*` prefixes a partial is allowed to declare. The
 * result is a closed set the test scans declarations against. The string is
 * the segment immediately after `--set-` (no trailing dash) — so a declaration
 * of `--set-button-color` is allowed when the result contains `'button'`.
 */
export function allowedTokenPrefixes(path: string): readonly string[] {
	const folder = partialFolder(path)
	const basename = partialBasename(path)
	if (folder === null) return []
	const contract = FOLDER_CONTRACTS[folder]
	const exception = exceptionFor(path)
	const extras = exception?.additionalTokenPrefixes ?? []

	switch (contract.tokenNamespace.kind) {
		case 'filename':
			return [basename, ...extras]
		case 'dimension':
			return ['variant', 'size', 'style', 'state', 'placement', ...extras]
		case 'free':
			return ['*', ...extras] // wildcard — caller treats '*' as "anything allowed"
		case 'none':
			return [...extras]
	}
}

/**
 * True when the partial's token-namespace policy is "free" (no namespace
 * restriction).
 */
export function hasFreeTokenNamespace(path: string): boolean {
	return allowedTokenPrefixes(path).includes('*')
}

// ── Indices ─────────────────────────────────────────────────────────────────

/** The five style layers, in cascade order. */
export const STYLE_LAYERS: readonly StyleLayer[] = [
	'elements',
	'modifiers',
	'surfaces',
	'components',
	'composables',
]

/** Layer ↔ folder name (currently identical, but isolated for future renames). */
export function folderForLayer(layer: StyleLayer): string {
	return layer
}

// ============================================================================
// Modifier-dimension token contracts
// ============================================================================
//
// Every modifier class in a dimension MUST declare the dimension's full
// required context-token set. This is the contract that lets element
// partials consume `var(--set-{dimension}-X)` with confidence — if a
// variant class drops `--set-variant-border-color`, every consumer's
// fallback chain silently degrades to a transparent border. The parity
// test at `tests/src/styles/_dimensions.test.ts` enforces the coverage.
//
// The token names are property suffixes (no `--set-{dimension}-` prefix);
// the test builds the full token name per dimension when matching.

export interface ModifierDimensionContract {
	/** The class-name set for the dimension, from `modifiers.{dim}`. */
	readonly classes: readonly string[]
	/**
	 * Property suffixes every class in the dimension MUST declare. The full
	 * declaration name is `--set-{dimension}-{suffix}`.
	 *
	 * Empty when the dimension emits direct CSS properties instead of
	 * context tokens (state classes hard-code `opacity` / `cursor`;
	 * placement classes hard-code `position-area`).
	 */
	readonly requiredTokens: readonly string[]
	/** One-sentence rationale shown in failure messages. */
	readonly rationale: string
}

export const MODIFIER_DIMENSION_TOKENS: Readonly<Record<string, ModifierDimensionContract>> = {
	variant: {
		classes: [
			'primary',
			'secondary',
			'tertiary',
			'success',
			'warning',
			'danger',
			'information',
		],
		requiredTokens: [
			// FILLED tier — saturated identity surface.
			'color',
			'background-color',
			'border-color',
			'border-width',
			// SUBTLE tier — tinted bg + emphasis text + subtle border.
			'subtle-color',
			'subtle-background-color',
			'subtle-border-color',
			// ON-CANVAS tier — unboxed variant text safe against body canvas.
			'on-canvas-color',
		],
		rationale:
			'Variant classes drive three downstream treatments (FILLED, SUBTLE, ON-CANVAS). Dropping a tier token silently breaks the fallback chain in every consumer.',
	},
	size: {
		classes: ['small', 'large'],
		requiredTokens: [
			'padding-inline',
			'padding-block',
			'font-size',
			'border-radius',
		],
		rationale:
			'Size classes bundle the four geometry tokens elements consume to scale chrome coherently. Missing one leaves the element half-resized.',
	},
	style: {
		classes: ['subtle', 'filled'],
		requiredTokens: [
			'color',
			'background-color',
			'border-color',
			'border-width',
		],
		rationale:
			'Style classes rewrite the element surface from the variant tier. The four tokens must move together; partial coverage leaves the surface inconsistent.',
	},
	state: {
		classes: ['disabled', 'active', 'loading'],
		requiredTokens: [], // direct CSS properties (opacity, cursor, pointer-events)
		rationale:
			'State classes emit direct CSS properties (cursor, pointer-events, opacity). No context tokens are required today; future refactor may expose `--set-state-disabled-opacity` for global retuning.',
	},
	placement: {
		classes: ['top', 'bottom', 'start', 'end', 'top-start', 'top-end', 'bottom-start', 'bottom-end'],
		requiredTokens: [], // direct CSS properties (position-area, align-self, justify-self)
		rationale:
			'Placement classes emit `position-area` + `align-self` + `justify-self` directly. The cascade composes these with anchor positioning; no tokens are tunable.',
	},
}

// ============================================================================
// Surface contracts
// ============================================================================
//
// Each file in `src/styles/surfaces/` paints a single browser-rendered
// pseudo-element / attribute surface (`::backdrop`, `[popover]`,
// `:focus-visible`, etc.) and owns a dedicated `--set-{surface}-*` token
// namespace. SURFACE_CONTRACTS records the per-surface contract:
//
//   - `selectorKinds` — which selector heads the partial may use. Each
//     surface has ONE canonical head (`::marker` for marker, `[popover]`
//     for popover) plus occasional siblings (dialog::backdrop and
//     [popover]::backdrop share the backdrop surface).
//
//   - `requiredTokens` — property suffixes the partial MUST declare on
//     `:root` (or accessible scope). Pseudo-elements can't carry
//     `--set-*` declarations directly, so surface tokens live on `:root`
//     by design.
//
//   - `animated` — when true, the partial MUST use `@include transition(…)`
//     OR `@include reduced-motion { … }` somewhere. Surfaces that
//     animate without the mixin break the reduced-motion contract.
//
// Adding a new surface is a deliberate framework decision: add the
// partial, add the entry here, add the parity test will verify the
// token coverage + mixin discipline.

export interface SurfaceContract {
	/** Filename basename (no `_` prefix, no `.scss` suffix). */
	readonly name: string
	/**
	 * Token-namespace prefix the partial declares. Usually equals `name`,
	 * but some surfaces are named after the CSS feature (anchor-position)
	 * while their tokens live under a shorter prefix (anchor). Defaults
	 * to `name` when omitted.
	 */
	readonly tokenPrefix?: string
	/** Selector head kinds the partial uses as rule openers. */
	readonly selectorKinds: readonly SelectorKind[]
	/**
	 * Property suffixes every surface MUST declare. The full token name
	 * is `--set-{tokenPrefix ?? name}-{suffix}`.
	 */
	readonly requiredTokens: readonly string[]
	/**
	 * True when the surface paints motion (transition or animation). The
	 * partial MUST invoke `@include transition(...)` OR
	 * `@include reduced-motion { ... }` somewhere.
	 */
	readonly animated: boolean
	/** One-sentence description shown in failure messages. */
	readonly notes: string
}

export const SURFACE_CONTRACTS: Readonly<Record<string, SurfaceContract>> = {
	'anchor-position': {
		name: 'anchor-position',
		tokenPrefix: 'anchor',
		selectorKinds: ['attribute'],
		requiredTokens: [
			'gap',
			'max-block-size',
			'max-inline-size',
			'position-area',
			'position-try-fallbacks',
			'position-try-order',
			'viewport-inset',
		],
		animated: false,
		notes:
			'Anchor positioning surface for popover hosts. Reads cross-surface anchor tokens via var() composition. Filename names the CSS feature; tokens live under --set-anchor-*.',
	},
	backdrop: {
		name: 'backdrop',
		selectorKinds: ['pseudo-element', 'tag'],
		requiredTokens: ['background-color', 'backdrop-filter', 'transition-duration'],
		animated: true,
		notes:
			'Top-layer scrim for modal <dialog> and offcanvas drawer popovers. Animates on open / close.',
	},
	focus: {
		name: 'focus',
		selectorKinds: ['pseudo-class'],
		requiredTokens: ['color'],
		animated: false,
		notes:
			'Universal focus-ring surface. Reads --set-variant-background-color so the ring tints with the active variant.',
	},
	marker: {
		name: 'marker',
		selectorKinds: ['pseudo-element'],
		requiredTokens: ['color', 'content'],
		animated: false,
		notes: 'List-item marker surface. <summary> opts out via its own ::before marker.',
	},
	placeholder: {
		name: 'placeholder',
		selectorKinds: ['pseudo-element'],
		requiredTokens: ['color', 'opacity'],
		animated: false,
		notes: 'Form-control placeholder text surface (<input>, <textarea>).',
	},
	popover: {
		name: 'popover',
		selectorKinds: ['attribute'],
		requiredTokens: [
			'color',
			'background-color',
			'border-color',
			'border-width',
			'border-radius',
			'padding-inline',
			'padding-block',
			'box-shadow',
			'transition-duration',
			'max-inline-size',
			'viewport-inset',
		],
		animated: true,
		notes:
			'Top-layer floating panel surface (auto / hint variants). Full chrome with motion + anchor composition.',
	},
	scrollbar: {
		name: 'scrollbar',
		selectorKinds: ['universal'],
		requiredTokens: ['thumb-color', 'track-color', 'width', 'gutter'],
		animated: false,
		notes:
			'CSS Scrollbars Level 1 surface. Uses * because scrollbar-width / scrollbar-gutter do not inherit.',
	},
	selection: {
		name: 'selection',
		selectorKinds: ['pseudo-element'],
		requiredTokens: ['background-color', 'color'],
		animated: false,
		notes: 'Text-selection highlight surface (::selection).',
	},
	'view-transition': {
		name: 'view-transition',
		selectorKinds: ['pseudo-element'],
		requiredTokens: ['duration', 'timing-function'],
		animated: true,
		notes:
			'View Transitions API surface. Cross-page / cross-state snapshot tween with reduced-motion compliance.',
	},
}

/** Read the surface contract for a partial basename, or null. */
export function surfaceContractFor(name: string): SurfaceContract | null {
	return SURFACE_CONTRACTS[name] ?? null
}

// ============================================================================
// Component contracts
// ============================================================================
//
// Each file in `src/styles/components/` paints either a tag-rooted shell
// composition (`<article>` card, `<form>` stack, `<nav>` rails) or a
// class-component primitive that has no semantic root (`.badge`, `.dot`,
// `.spinner`). COMPONENT_CONTRACTS records the per-component contract:
//
//   - `tokenPrefix` — the primary `--set-{prefix}-*` namespace. Multi-
//     namespace components (`_aside.scss`, `_div.scss`, `_output.scss`,
//     `_nav.scss`) record additional prefixes through FILE_EXCEPTIONS so
//     the namespace check at `_contracts.test.ts` honors them.
//
//   - `requiredTokens` — the minimum token surface the component MUST
//     declare. Locks in the shipped contract; future removal of a token
//     fails the parity test.
//
//   - `animated` — true when the partial declares a `transition-duration`
//     or `*-duration` token. The partial MUST invoke `@include transition()`
//     OR `@include reduced-motion { … }` (same rule as surfaces).
//
//   - `notes` — one-sentence description for failure messages.

export interface ComponentContract {
	readonly name: string
	readonly tokenPrefix?: string // defaults to `name`
	readonly requiredTokens: readonly string[]
	readonly animated: boolean
	readonly notes: string
}

export const COMPONENT_CONTRACTS: Readonly<Record<string, ComponentContract>> = {
	// ── Tag-rooted shell compositions ──────────────────────────────────────
	article: {
		name: 'article',
		requiredTokens: [
			'color',
			'background-color',
			'border-color',
			'border-width',
			'border-radius',
			'padding-inline',
			'padding-block',
			'gap',
			'font-size',
			'line-height',
			'box-shadow',
			'transition-duration',
			'disabled-opacity',
		],
		animated: true,
		notes: "Card surface. Full chrome (color, bg, border, padding, gap, box-shadow, motion).",
	},
	aside: {
		name: 'aside',
		requiredTokens: [
			'color',
			'background-color',
			'border-color',
			'border-width',
			'padding-inline',
			'padding-block',
			'inline-size',
			'gap',
			'font-size',
			'line-height',
			'transition-duration',
			// Drawer sub-namespace (still under --set-aside-drawer-*).
			'drawer-inline-size',
			'drawer-block-size',
			'drawer-z-index',
			'drawer-padding-inline',
			'drawer-padding-block',
			'drawer-band-gap',
		],
		animated: true,
		notes:
			"<aside> plays three roles (sidebar / callout / alert) + drawer variant. Multi-namespace contract; callout-* and alert-* are recorded via FILE_EXCEPTIONS.",
	},
	body: {
		name: 'body',
		requiredTokens: ['rail-width'],
		animated: false,
		notes: 'Body-grid shell. One token: --set-body-rail-width tunes the sidebar / TOC rails.',
	},
	footer: {
		name: 'footer',
		requiredTokens: [
			'color',
			'background-color',
			'border-color',
			'border-width',
			'padding-inline',
			'padding-block',
			'font-size',
			'line-height',
			'transition-duration',
		],
		animated: true,
		notes: 'Page footer chrome. Mirrors the header surface.',
	},
	form: {
		name: 'form',
		requiredTokens: ['gap', 'row-gap', 'label-gap', 'transition-duration'],
		animated: true,
		notes: 'Form-control stack. Layout-only; chrome flows from the per-control element files.',
	},
	header: {
		name: 'header',
		requiredTokens: [
			'color',
			'background-color',
			'border-color',
			'border-width',
			'padding-inline',
			'padding-block',
			'font-size',
			'line-height',
			'transition-duration',
		],
		animated: true,
		notes: 'Page app-bar chrome. Mirrors the footer surface.',
	},
	main: {
		name: 'main',
		requiredTokens: [],
		animated: false,
		notes:
			'Layout-only main content area. No --set-main-* tokens by design; spacing flows from --set-stack-spacing / --set-gap.',
	},
	menu: {
		name: 'menu',
		requiredTokens: [
			'color',
			'background-color',
			'gap',
			'padding-inline',
			'padding-block',
			'justify-content',
			'transition-duration',
		],
		animated: true,
		notes: 'Toolbar / action-row component + dropdown panel chrome.',
	},
	nav: {
		name: 'nav',
		requiredTokens: [
			'color',
			'background-color',
			'border-color',
			'border-width',
			'inline-size',
			'padding-inline',
			'padding-block',
			'gap',
			'font-size',
			'line-height',
			'transition-duration',
			// Breadcrumb sub-namespace.
			'breadcrumb-separator-image',
			'breadcrumb-separator-size',
			'breadcrumb-separator-opacity',
			'breadcrumb-active-color',
			// Pagination sub-namespace.
			'pagination-color',
			'pagination-background-color',
			'pagination-border-color',
			'pagination-border-width',
			'pagination-border-radius',
			'pagination-padding-inline',
			'pagination-padding-block',
			'pagination-min-size',
			'pagination-hover-background-color',
			'pagination-active-color',
			'pagination-active-background-color',
			'pagination-active-border-color',
			'pagination-disabled-opacity',
		],
		animated: true,
		notes:
			'<nav> carries sidebar rail, breadcrumb, and pagination patterns. Sub-namespaces declared under --set-nav-{breadcrumb,pagination}-*.',
	},
	output: {
		name: 'output',
		tokenPrefix: 'toast',
		requiredTokens: [
			'color',
			'background-color',
			'border-color',
			'border-width',
			'border-radius',
			'padding-inline',
			'padding-block',
			'gap',
			'min-inline-size',
			'max-inline-size',
			'font-size',
			'box-shadow',
			'edge-inset',
			'z-index',
			'spacing',
			'stack-offset',
			'stack-index',
			'stack-depth',
			'peek-height',
			'scale-step',
			'opacity-step',
			'front-height',
			'hidden-count',
		],
		animated: false, // _output.scss has no own duration token; motion lives in composables/_toast.scss
		notes:
			'<output popover> becomes a toast. Tokens live under --set-toast-* (filename names the element; namespace names the surface).',
	},
	'role-group': {
		name: 'role-group',
		requiredTokens: ['border-width'],
		animated: false,
		notes:
			'ARIA [role=group] / [role=toolbar] component. Minimal contract — most chrome flows from descendant elements.',
	},
	search: {
		name: 'search',
		requiredTokens: [
			'color',
			'background-color',
			'padding-inline',
			'padding-block',
			'gap',
			'transition-duration',
		],
		animated: true,
		notes: 'Search-bar wrapper component.',
	},

	// ── Class-component primitives ─────────────────────────────────────────
	badge: {
		name: 'badge',
		requiredTokens: [
			'color',
			'background-color',
			'border-radius',
			'padding-inline',
			'padding-block',
			'font-size',
			'font-weight',
			'line-height',
		],
		animated: false,
		notes: '.badge — inline pill for counts and status keywords.',
	},
	div: {
		name: 'div',
		tokenPrefix: 'stack',
		requiredTokens: ['gap'],
		animated: false,
		notes:
			'.stack and .cluster class-component primitives carried by <div>. Additional --set-cluster-* prefix via FILE_EXCEPTIONS.',
	},
	dot: {
		name: 'dot',
		requiredTokens: ['size', 'background-color', 'pulse-duration', 'pulse-easing'],
		animated: true,
		notes: '.dot — colored circle indicator (status / presence).',
	},
	skeleton: {
		name: 'skeleton',
		requiredTokens: [
			'background-color',
			'highlight-color',
			'border-radius',
			'duration',
			'line-block-size',
			'line-gap',
		],
		animated: true,
		notes: '.skeleton — loading placeholder with animated shimmer.',
	},
	spinner: {
		name: 'spinner',
		requiredTokens: ['size', 'color', 'border-width', 'duration'],
		animated: true,
		notes: '.spinner — animated loading indicator.',
	},
	tag: {
		name: 'tag',
		requiredTokens: [
			'color',
			'background-color',
			'border-color',
			'border-width',
			'border-radius',
			'padding-inline',
			'padding-block',
			'font-size',
			'font-weight',
			'line-height',
			'gap',
			'transition-duration',
		],
		animated: true,
		notes: '.tag — chip label with optional close affordance.',
	},
}

/** Read the component contract for a partial basename. */
export function componentContractFor(name: string): ComponentContract | null {
	return COMPONENT_CONTRACTS[name] ?? null
}

// ============================================================================
// Interactive-element registry
// ============================================================================
//
// The framework paints focus / hover / disabled chrome on a specific, closed
// set of native HTML elements. Every member of this set is held to two
// accessibility-critical requirements, enforced by
// `tests/src/styles/_interactive.test.ts`:
//
//   1. Forced-colors mode coverage — Windows High Contrast strips author
//      colors and replaces them with system tokens. Interactive elements
//      must include `@include forced-colors { … }` (the mixin from
//      `_mixins.scss`) so the affordance remains visible in HC mode.
//
//   2. Focus-visible discipline — keyboard focus chrome must use
//      `:focus-visible`, never bare `:focus`. The bare form fires on
//      mouse click and produces visual noise; `:focus-visible` is the
//      modern, accessible primitive that distinguishes keyboard focus
//      from mouse focus.
//
// Adding a new tag to the set commits the partial to both rules. The set is
// deliberately small — passive elements (paragraphs, headings, sectioning
// containers) don't paint interaction chrome.

/**
 * Tags whose `_{tag}.scss` partial paints interaction chrome (hover /
 * focus / active / disabled). The audit pass that produced this set walked
 * every element partial and selected the ones that declare at least one of
 * `:hover`, `:focus`, `:focus-visible`, `:active`, `:disabled`, `[disabled]`,
 * or `[aria-disabled]` state rules.
 *
 * Excluded by design:
 *   - Form-control parents (`<form>`, `<datalist>`, `<optgroup>`, `<option>`)
 *     — they delegate interaction to their controls.
 *   - Sectioning containers (`<main>`, `<section>`, `<article>`) — they
 *     have layout chrome but no interaction surface.
 *   - Heading / typographic elements — passive text.
 *   - Media embeds (`<video>`, `<audio>`) — UA owns the controls.
 */
export const INTERACTIVE_ELEMENTS: ReadonlySet<string> = new Set([
	'a',
	'button',
	'details',
	'dialog',
	'fieldset',
	'input',
	'label',
	'select',
	'summary',
	'textarea',
])

/** True when the tag's element partial is expected to paint interaction chrome. */
export function isInteractive(tag: string): boolean {
	return INTERACTIVE_ELEMENTS.has(tag)
}

/**
 * Regex that matches a bare `:focus` state rule (not `:focus-visible`,
 * `:focus-within`, etc.). The bare form is the deviation — every keyboard-
 * focus rule should be `:focus-visible`.
 *
 * NOTE: this regex catches every `:focus` token whether it appears as a
 * rule selector OR inside a functional pseudo (`:not(:focus)`,
 * `:has(:focus)`). The latter are legitimate — bare `:focus` inside a
 * negation or relational pseudo is the correct way to test "currently
 * focused via any input modality". Use `hasBareFocusRule(source)` for
 * the higher-level check that strips functional-pseudo bodies first.
 */
export const BARE_FOCUS_REGEX = /:focus(?![-a-z])/

/**
 * True when `source` contains a bare `:focus` rule selector — `:focus`
 * outside `:not(:focus)`, `:is(:focus, …)`, `:where(:focus)`, `:has(:focus)`
 * functional-pseudo bodies. The bare rule selector is the deviation; the
 * functional-pseudo usages are legitimate (negation / grouping / relational).
 *
 * The implementation strips functional-pseudo bodies first, then applies
 * `BARE_FOCUS_REGEX` to the remainder.
 */
export function hasBareFocusRule(source: string): boolean {
	const stripped = source.replace(/:(?:not|is|where|has)\([^)]*\)/g, '')
	return BARE_FOCUS_REGEX.test(stripped)
}

/**
 * Regex that matches the `@include forced-colors` mixin invocation. The
 * mixin is defined in `src/styles/_mixins.scss`; every interactive element
 * must invoke it at least once.
 */
export const FORCED_COLORS_INCLUDE_REGEX = /@include\s+forced-colors\b/

/**
 * Regex that matches the `@include transition` mixin invocation. Every
 * `transition:` declaration in non-vendor-pseudo scope should pair with
 * this mixin so the reduced-motion contract holds.
 */
export const TRANSITION_INCLUDE_REGEX = /@include\s+transition\s*\(/

// ============================================================================
// Scope discipline
// ============================================================================
//
// Cross-cutting selectors that combine an attribute / pseudo-element head
// with a modifier-class qualifier (e.g. `[popover].top`,
// `dialog::backdrop.modal`) need explicit scoping to prevent bleeding into
// elements whose intrinsic chrome conflicts with the rule. Two anti-
// patterns the parity test catches:
//
//   1. CHAINED NOTS — `[popover]:not(aside):not(nav):not(output).top`
//      Each `:not(tag)` adds 0,0,1 to specificity. Three of them inflate
//      the rule to 0,2,3 instead of the intended 0,2,0. Collapse to
//      `:not(:where(t1, t2, t3))` — `:where()` contributes 0 to
//      specificity, keeping the rule's weight flat.
//
//   2. UNSCOPED CROSS-CUTTING — `[popover].top` with no scoping at all.
//      Applies to every popover host including those with intrinsic
//      placement chrome (aside drawers, nav rails, output toasts). New
//      popover-able elements added later silently inherit the rule. The
//      fix is either a `:not(:where(...))` blocklist or an `:is(...)`
//      allowlist; both make the rule's scope explicit.
//
// The "modifier-class compound" check looks at rules whose selector
// contains BOTH an attribute / pseudo head AND a `.{name}` class
// qualifier where `{name}` is in the cross-cutting modifier vocabulary.
// Bare attribute rules (`[popover] { … }`) without a modifier class are
// broad-default and don't trigger the check — that's by design.

/**
 * True when the selector contains two or more chained `:not(TAG)` or
 * `:not([ATTR])` qualifiers — the specificity-inflation anti-pattern.
 *
 * Each `:not(tag)` adds 0,0,1 and each `:not([attr])` adds 0,1,0 to the
 * rule's specificity. Three of them lift a `[popover].top` rule from
 * the intended 0,2,0 to 0,2,3, which can out-fight unrelated rules in
 * the cascade. The fix is collapsing to a single
 * `:not(:where(t1, t2, t3))` — `:where()` contributes 0 to specificity
 * regardless of how many tags it contains.
 *
 * Pseudo-class `:not()` chains (e.g. `:not(:first-child):not(:last-child)`,
 * `:not(:placeholder-shown):not(:focus)`) are NOT flagged — they're
 * position / state checks where the inflation rarely matters and the
 * idiom is widely recognized. Only tag and attribute `:not()` chains
 * surface here.
 */
export function hasChainedTagNots(selector: string): boolean {
	// Match :not(content) where content is a tag name (`[a-z][a-z0-9-]*`)
	// or an attribute selector (`[…]`). Pseudo-class :not() chains are
	// out of scope.
	const matches = selector.match(/:not\((?:[a-z][a-z0-9-]*|\[[^\]]+\])\)/g) ?? []
	return matches.length >= 2
}

/**
 * @deprecated Use `hasChainedTagNots` instead. This helper flagged any
 * chained `:not()` including pseudo-class chains, which produced too many
 * false positives. Kept for backwards compatibility with the early
 * scope-discipline draft; new tests should use `hasChainedTagNots`.
 */
export function hasChainedNots(selector: string): boolean {
	return hasChainedTagNots(selector)
}

/**
 * True when the selector includes a `:where(...)` or `:is(...)`
 * functional pseudo containing a tag list — the canonical scope-
 * discipline construct. A rule with this form has explicit scoping.
 */
export function hasScopingFunction(selector: string): boolean {
	return /:(?:where|is)\([^)]+\)/.test(selector)
}

/**
 * Extract class qualifiers from a selector. Examples:
 *   '[popover].top' → ['top']
 *   'button.primary.large' → ['primary', 'large']
 *   ':is(aside, nav)[popover].drawer' → ['drawer']
 *   'h1' → []
 */
export function classQualifiers(selector: string): readonly string[] {
	const out: string[] = []
	const regex = /\.([a-z][a-z0-9-]*)/g
	let match: RegExpExecArray | null
	while ((match = regex.exec(selector)) !== null) {
		if (match[1]) out.push(match[1])
	}
	return out
}

/**
 * Detect whether a selector contains an attribute or pseudo head — the
 * "broad" half of a cross-cutting selector. Includes `[attr]`, `[attr=…]`,
 * `:pseudo-class`, and `::pseudo-element` heads.
 */
export function hasBroadHead(selector: string): boolean {
	return /(?:^|\s|>|\+|~|,)\s*(?:\[[^\]]+\]|:(?!root\b)(?!is\b)(?!where\b)(?!not\b)(?!has\b)[a-z-]+(?:\([^)]*\))?|::[a-z-]+)/.test(
		' ' + selector,
	)
}
