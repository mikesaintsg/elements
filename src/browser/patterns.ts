// ============================================================================
// Style-folder structural contracts.
//
// One contract per folder under `src/styles/`. Every SCSS partial in a folder
// is held to the matching contract by the parity test at
// `tests/guides/patterns/contracts.test.ts`.
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

import { leadingTagsOfCompound, splitTopLevel, trailingTagsOfCombinatorChain } from './helpers.js'

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

/** Per-folder structural contract. Field names are single-word leaves
 *  per AGENTS.md §4.1 — directional / collection intent that used to
 *  live in compound names (`allowCommentOnly`, `requireStateSelector`,
 *  `allowedHeadKinds` / `forbiddenHeadKinds`, `tokenNamespace`) is
 *  re-expressed as nested entity keys (`comments.allowed`,
 *  `state.required`, `head.{allowed,forbidden}`, `tokens`). */
export interface FolderContract {
	readonly layer: StyleLayer
	/** One-sentence description for failure messages. */
	readonly description: string
	/** Comment-only-partial policy. `allowed: true` means a partial may
	 *  contain no rule bodies (passthrough stubs / behavior-only files). */
	readonly comments: { readonly allowed: boolean }
	/** Composable-state-selector gating. `required: true` means every
	 *  rule in the partial must gate on `[data-{name}-*]` / `[aria-*=]` /
	 *  `[open]` / `:popover-open` / `:modal` / `:open`. */
	readonly state: { readonly required: boolean }
	/** Head-selector policy. `allowed` is the permitted set; `forbidden`
	 *  lists kinds that have a clearly-better home in another folder,
	 *  with the recommended home in the failure message. Order matters
	 *  in `forbidden` — the first match wins. */
	readonly head: {
		readonly allowed: readonly SelectorKind[]
		readonly forbidden: ReadonlyArray<{
			readonly kind: SelectorKind
			readonly recommendation: string
		}>
	}
	/** Token namespace policy. */
	readonly tokens: TokenNamespacePolicy
}

// ── Folder contracts ───────────────────────────────────────────────────────

export const FOLDER_CONTRACTS: Readonly<Record<StyleLayer, FolderContract>> = {
	elements: {
		layer: 'elements',
		description:
			'One partial per HTML tag. Substantive partials declare --set-{tag}-* tokens via a fallback chain (style → variant → size → element default); reset partials normalize UA defaults only; passthrough partials are comment-only stubs.',
		comments: { allowed: true },
		state: { required: false },
		head: {
			allowed: [
				'tag',
				'root', // nested :root blocks for consumer-overridable globals (e.g. button.dropdown caret tokens)
				'nested', // &-prefixed for state pseudo-classes inside the element selector
				'at-rule',
			],
			forbidden: [
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
		},
		tokens: { kind: 'filename' },
	},
	modifiers: {
		layer: 'modifiers',
		description:
			'Cross-cutting modifier classes (5 dimensions) + _local.scss for element-local modifiers. Modifiers set --set-{dimension}-* context tokens; elements consume them.',
		comments: { allowed: false }, // even _local.scss has a charter
		state: { required: false },
		head: {
			allowed: [
				'class', // bare .primary, .small, .filled, .disabled
				'attribute', // [popover]:not(aside)... in _placements.scss
				'tag', // form.row, button.dropdown in _local.scss (head is the tag, qualifier is the modifier)
				'at-rule',
			],
			forbidden: [
				{
					kind: 'pseudo-element',
					recommendation: 'pseudo-element rules belong in surfaces/',
				},
				{
					kind: 'data-attribute',
					recommendation: 'composable-state attributes belong in composables/{matching-name}.scss',
				},
			],
		},
		tokens: { kind: 'dimension' },
	},
	surfaces: {
		layer: 'surfaces',
		description:
			'Pseudo-elements + attribute selectors. Each surface owns a --set-{surface}-* token namespace and may read tokens from sibling surfaces via var().',
		comments: { allowed: false },
		state: { required: false },
		head: {
			allowed: [
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
			forbidden: [
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
		},
		tokens: { kind: 'filename' },
	},
	components: {
		layer: 'components',
		description:
			'Element compositions (article, form, nav) + class-component primitives (.badge, .dot, .tag). Substantive baselines for tags whose chrome is too rich for elements/.',
		comments: { allowed: false },
		state: { required: false },
		head: {
			allowed: [
				'tag', // article, aside, body, footer, form, header, main, menu, nav, output, search
				'class', // .badge, .dot, .skeleton, .spinner, .tag, .stack, .cluster
				'attribute', // [popover] for menu / nav drawer
				'role-attribute', // [role='tablist'], [role='tab'], [role='tabpanel'], [role='group'], [role='toolbar']
				'pseudo-class', // :is(aside, nav) / :where(...) for selector grouping
				'root', // :root for consumer-overridable global tokens (toast edge inset, nav breadcrumb separator, etc.)
				'nested',
				'at-rule',
			],
			forbidden: [
				{
					kind: 'pseudo-element',
					recommendation: 'top-level pseudo-element rules belong in surfaces/',
				},
			],
		},
		tokens: { kind: 'filename' }, // each file owns its basename; adjacent namespaces opt in via FILE_EXCEPTIONS
	},
	composables: {
		layer: 'composables',
		description:
			'Chrome partials gated on composable state ([data-*], [aria-*=...], [role=...], [open], :popover-open, :modal, :open). Filename matches a use{Name} factory.',
		comments: { allowed: true }, // _aside.scss is intentionally chrome-free (useAside is behavior-only)
		state: { required: true },
		head: {
			allowed: [
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
			forbidden: [
				{
					kind: 'pseudo-element',
					recommendation: 'top-level pseudo-element rules belong in surfaces/',
				},
			],
		},
		tokens: { kind: 'free' }, // composables read/override any namespace by design
	},
}

// ── File exceptions ────────────────────────────────────────────────────────
//
// Named overrides for the small set of known-good outliers. The contract
// test consults this map before applying the default folder contract. Each
// exception names what it relaxes and why — the comment is the justification
// future authors will read.

/** Named override for a known-good outlier partial. Mirrors the
 *  FolderContract field names (`comments.allowed`, `state.required`,
 *  `tokens.extras`) so the override reads as a per-file delta. */
export interface FileException {
	/** Override the folder's comment-only policy. Set
	 *  `{ allowed: true }` to permit a comment-only partial when the
	 *  folder default forbids it. */
	readonly comments?: { readonly allowed: boolean }
	/** Override the folder's composable-state-gating requirement. Set
	 *  `{ required: false }` to exempt the partial from the rule. */
	readonly state?: { readonly required: boolean }
	/** Extra token-namespace prefixes the partial may declare in
	 *  addition to the folder's defaults. */
	readonly tokens?: { readonly extras: readonly string[] }
	/** Free-form note recorded in the failure message when relevant. */
	readonly note: string
}

export const FILE_EXCEPTIONS: Readonly<Record<string, FileException>> = {
	// composables/_aside.scss — useAside is a thin programmatic shim over
	// the native Popover API; the drawer's geometry + slide animation lives
	// in components/_aside.scss as the `aside[popover]` rule (driven by
	// `:popover-open` + `@starting-style` + `allow-discrete`, no JS-side
	// lifecycle attributes). This partial exists as a placeholder so the
	// composables/ inventory mirrors the browser/composables/ inventory.
	'composables/_aside.scss': {
		state: { required: false },
		comments: { allowed: true },
		note: 'useAside is a programmatic shim; chrome lives in components/_aside.scss',
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
		tokens: { extras: ['callout', 'alert', 'variant', 'popover', 'anchor'] },
		note: '<aside> plays three roles (sidebar / callout / alert) + drawer overrides for variant/popover/anchor cascade',
	},

	// components/_output.scss — `<output popover>` becomes a toast.
	// Toast-deck geometry uses --set-toast-* in addition to the bare-output
	// --set-output-* namespace. Pairing with useToast / createToast. The
	// banded header/footer chrome's trailing dismiss button overrides
	// --set-variant-* on the button to read as a quiet icon regardless of
	// the surface variant — same cross-namespace pattern aside-alert uses
	// for its dismiss reset (see `components/_aside.scss` exception above).
	'components/_output.scss': {
		tokens: { extras: ['toast', 'variant'] },
		note: '<output popover> promotes to toast; band-dismiss button overrides --set-variant-* (parallel to aside-alert)',
	},

	// components/_div.scss — class-component primitives .stack and .cluster
	// share <div> as their carrier. Tokens flow under their class names, not
	// "div".
	'components/_div.scss': {
		tokens: { extras: ['stack', 'cluster', 'tiles', 'split'] },
		note: '.stack, .cluster, .tiles, and .split class-component primitives carried by <div>',
	},

	// modifiers/_local.scss — element-local modifier classes (article.frame,
	// form.row, button.dropdown, …). Each rule's selector starts with
	// an element tag; rules MAY declare `--set-{tag}-*` tokens scoped to
	// that same element (per the file's charter — quote: "Tokens may be
	// written here, but only `--set-{tag}-*` tokens scoped to the same
	// element the selector targets"). The `article.frame` rule retunes
	// the article's outer inset + gap via its `--set-article-padding-*` /
	// `--set-article-gap` tokens so consumer overrides flow through the
	// same cascade an inline-token incantation used to; declaring the
	// token (vs. the raw `padding: 0`) is the framework-correct path
	// because `<article> > <header>`'s bleed margin reads from the same
	// token. As `_local.scss` grows it will need other element prefixes —
	// extend the list then.
	'modifiers/_local.scss': {
		tokens: { extras: ['article', 'table-cell'] },
		note: 'element-local modifiers may declare --set-{tag}-* tokens for the element their selector targets (article.frame, td.frame)',
	},

	// components/_nav.scss — declares --set-tablist-* and --set-tab-* on
	// `[role='tablist']` / `[role='tab']` because the breadcrumb / pagination
	// / tabs patterns all share <nav> as their root.
	'components/_nav.scss': {
		tokens: { extras: ['tablist', 'tab', 'tabpanel'] },
		note: '<nav> carries breadcrumb / pagination / tablist patterns; shared --set-tab*-* namespace',
	},

	// surfaces/_popover.scss — the tooltip variant ships --set-popover-hint-*
	// AND the file also reads cross-surface tokens from anchor-position
	// (`var(--set-anchor-max-inline-size)`). The cross-surface reads are
	// legitimate composition; the hint-namespace declaration extends the
	// surface's own prefix.
	'surfaces/_popover.scss': {
		tokens: { extras: ['popover-hint', 'anchor'] },
		note: 'popover surface reads anchor tokens by design + extends with hint namespace for tooltip variant',
	},

	// elements/_h1-h6.scss — multi-tag partial. Token namespace is
	// --set-heading-* (the logical group), not per-individual-tag.
	'elements/_h1-h6.scss': {
		tokens: { extras: ['heading'] },
		note: 'multi-tag partial covering h1 through h6; tokens share the --set-heading-* namespace',
	},

	// surfaces/_anchor-position.scss — file basename is `anchor-position`
	// but the surface's token namespace is `anchor` (the partial is named
	// after the CSS feature, not the namespace).
	'surfaces/_anchor-position.scss': {
		tokens: { extras: ['anchor'] },
		note: 'surface named after the CSS anchor-position feature; tokens live under --set-anchor-*',
	},

	// elements/_input.scss — the `<input>` element subtypes ship dedicated
	// namespaces (--set-check-* for checkbox / radio, --set-switch-* for
	// switch role, --set-range-* for range slider). Each subtype is its own
	// micro-design surface and gets its own prefix for consumer overrides.
	'elements/_input.scss': {
		tokens: { extras: ['check', 'switch', 'range', 'color', 'file'] },
		note: '<input> subtypes (checkbox / radio / switch / range / color / file) ship dedicated --set-{type}-* namespaces',
	},

	// elements/_li.scss + elements/_ul.scss — the list-group component pattern
	// (<ul class="group"> + <li class="group-item">) lives on the list
	// elements and declares its tokens under --set-group-*.
	'elements/_li.scss': {
		tokens: { extras: ['group'] },
		note: '<ul class="group"> list-group component carried by <li>; tokens under --set-group-*',
	},
	'elements/_ul.scss': {
		tokens: { extras: ['group'] },
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
		const branches = inner
			.split(',')
			.map((b) => b.trim())
			.filter((b) => b.length > 0)
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
	const extras = exception?.tokens?.extras ?? []

	switch (contract.tokens.kind) {
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
// test at `tests/src/styles/modifiers/_index.test.ts` enforces the coverage.
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
	 * `tokens.required` is empty when the dimension emits direct CSS
	 * properties instead of context tokens (state classes hard-code
	 * `opacity` / `cursor`; placement classes hard-code `position-area`).
	 *
	 * Nested under `tokens` for shape parity with `SurfaceContract`,
	 * `ComponentContract`, and `ComposableContract`.
	 */
	readonly tokens: {
		readonly required: readonly string[]
	}
	/** One-sentence rationale shown in failure messages. */
	readonly rationale: string
}

export const MODIFIER_DIMENSION_TOKENS: Readonly<Record<string, ModifierDimensionContract>> = {
	variant: {
		classes: ['primary', 'secondary', 'tertiary', 'success', 'warning', 'danger', 'information'],
		tokens: {
			required: [
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
		},
		rationale:
			'Variant classes drive three downstream treatments (FILLED, SUBTLE, ON-CANVAS). Dropping a tier token silently breaks the fallback chain in every consumer.',
	},
	size: {
		classes: ['small', 'large'],
		tokens: { required: ['padding-inline', 'padding-block', 'font-size', 'border-radius'] },
		rationale:
			'Size classes bundle the four geometry tokens elements consume to scale chrome coherently. Missing one leaves the element half-resized.',
	},
	style: {
		classes: ['subtle', 'filled'],
		tokens: { required: ['color', 'background-color', 'border-color', 'border-width'] },
		rationale:
			'Style classes rewrite the element surface from the variant tier. The four tokens must move together; partial coverage leaves the surface inconsistent.',
	},
	state: {
		classes: ['disabled', 'active', 'loading'],
		tokens: { required: [] }, // heterogeneous classes — no shared required set
		rationale:
			'State classes are heterogeneous (disabled dims/blocks, active marks, loading hints) so — unlike variant/size/style — there is no shared required-token set to enforce per-class; coverage is 0 by design. `.disabled` reads `--set-state-disabled-opacity` / `--set-state-disabled-cursor` for global `:root` retuning (the formerly-"future" refactor, now shipped); `pointer-events: none` stays the hard interaction lock.',
	},
	placement: {
		classes: [
			'top',
			'bottom',
			'start',
			'end',
			'top-start',
			'top-end',
			'bottom-start',
			'bottom-end',
		],
		tokens: { required: [] }, // direct CSS properties (position-area, align-self, justify-self)
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
//   - `selectors` — which selector heads the partial may use. Each
//     surface has ONE canonical head (`::marker` for marker, `[popover]`
//     for popover) plus occasional siblings (dialog::backdrop and
//     [popover]::backdrop share the backdrop surface).
//
//   - `tokens.required` — property suffixes the partial MUST declare on
//     `:root` (or accessible scope). Pseudo-elements can't carry
//     `--set-*` declarations directly, so surface tokens live on `:root`
//     by design. `tokens.prefix` overrides the basename when omitted
//     (used by `anchor-position` whose tokens live under `--set-anchor-*`).
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
	/** Token surface. `prefix` defaults to `name` when omitted (used by
	 *  surfaces named after a CSS feature like `anchor-position` whose
	 *  tokens live under a shorter prefix — `anchor`). `required` lists
	 *  the property suffixes every surface MUST declare; the full token
	 *  name is `--set-{prefix ?? name}-{suffix}`. */
	readonly tokens: {
		readonly prefix?: string
		readonly required: readonly string[]
	}
	/** Selector head kinds the partial uses as rule openers. */
	readonly selectors: readonly SelectorKind[]
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
		tokens: {
			prefix: 'anchor',
			required: [
				'gap',
				'max-block-size',
				'max-inline-size',
				'position-area',
				'position-try-fallbacks',
				'position-try-order',
				'viewport-inset',
			],
		},
		selectors: ['attribute'],
		animated: false,
		notes:
			'Anchor positioning surface for popover hosts. Reads cross-surface anchor tokens via var() composition. Filename names the CSS feature; tokens live under --set-anchor-*.',
	},
	backdrop: {
		name: 'backdrop',
		tokens: { required: ['background-color', 'backdrop-filter', 'transition-duration'] },
		selectors: ['pseudo-element', 'tag'],
		animated: true,
		notes:
			'Top-layer scrim for modal <dialog> and offcanvas drawer popovers. Animates on open / close.',
	},
	focus: {
		name: 'focus',
		tokens: { required: ['color'] },
		selectors: ['pseudo-class'],
		animated: false,
		notes:
			'Universal focus-ring surface. Reads --set-variant-background-color so the ring tints with the active variant.',
	},
	marker: {
		name: 'marker',
		tokens: { required: ['color', 'content'] },
		selectors: ['pseudo-element'],
		animated: false,
		notes: 'List-item marker surface. <summary> opts out via its own ::before marker.',
	},
	placeholder: {
		name: 'placeholder',
		tokens: { required: ['color', 'opacity'] },
		selectors: ['pseudo-element'],
		animated: false,
		notes: 'Form-control placeholder text surface (<input>, <textarea>).',
	},
	popover: {
		name: 'popover',
		tokens: {
			required: [
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
		},
		selectors: ['attribute'],
		animated: true,
		notes:
			'Top-layer floating panel surface (auto / hint variants). Full chrome with motion + anchor composition.',
	},
	scrollbar: {
		name: 'scrollbar',
		tokens: { required: ['thumb-color', 'track-color', 'width', 'gutter'] },
		selectors: ['universal'],
		animated: false,
		notes:
			'CSS Scrollbars Level 1 surface. Uses * because scrollbar-width / scrollbar-gutter do not inherit.',
	},
	selection: {
		name: 'selection',
		tokens: { required: ['background-color', 'color'] },
		selectors: ['pseudo-element'],
		animated: false,
		notes: 'Text-selection highlight surface (::selection).',
	},
	'view-transition': {
		name: 'view-transition',
		tokens: { required: ['duration', 'timing-function'] },
		selectors: ['pseudo-element'],
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
//   - `tokens.prefix` — the primary `--set-{prefix}-*` namespace. Multi-
//     namespace components (`_aside.scss`, `_div.scss`, `_output.scss`,
//     `_nav.scss`) record additional prefixes through FILE_EXCEPTIONS so
//     the namespace check at `contracts.test.ts` honors them.
//
//   - `tokens.required` — the minimum token surface the component MUST
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
	/** Token surface — same shape as SurfaceContract.tokens: `prefix`
	 *  defaults to `name` when omitted; `required` lists the minimum
	 *  per-component declaration set. */
	readonly tokens: {
		readonly prefix?: string
		readonly required: readonly string[]
	}
	readonly animated: boolean
	readonly notes: string
}

export const COMPONENT_CONTRACTS: Readonly<Record<string, ComponentContract>> = {
	// ── Tag-rooted shell compositions ──────────────────────────────────────
	article: {
		name: 'article',
		tokens: {
			required: [
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
		},
		animated: true,
		notes: 'Card surface. Full chrome (color, bg, border, padding, gap, box-shadow, motion).',
	},
	aside: {
		name: 'aside',
		tokens: {
			required: [
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
		},
		animated: true,
		notes:
			'<aside> plays three roles (sidebar / callout / alert) + drawer variant. Multi-namespace contract; callout-* and alert-* are recorded via FILE_EXCEPTIONS.',
	},
	body: {
		name: 'body',
		tokens: { required: ['rail-width'] },
		animated: false,
		notes: 'Body-grid shell. One token: --set-body-rail-width tunes the sidebar / TOC rails.',
	},
	footer: {
		name: 'footer',
		tokens: {
			required: [
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
		},
		animated: true,
		notes: 'Page footer chrome. Mirrors the header surface.',
	},
	form: {
		name: 'form',
		tokens: { required: ['gap', 'row-gap', 'label-gap', 'transition-duration'] },
		animated: true,
		notes: 'Form-control stack. Layout-only; chrome flows from the per-control element files.',
	},
	header: {
		name: 'header',
		tokens: {
			required: [
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
		},
		animated: true,
		notes: 'Page app-bar chrome. Mirrors the footer surface.',
	},
	main: {
		name: 'main',
		tokens: { required: [] },
		animated: false,
		notes:
			'Layout-only main content area. No --set-main-* tokens by design; spacing flows from --set-stack-spacing / --set-gap.',
	},
	menu: {
		name: 'menu',
		tokens: {
			required: [
				'color',
				'background-color',
				'gap',
				'padding-inline',
				'padding-block',
				'justify-content',
				'transition-duration',
			],
		},
		animated: true,
		notes: 'Toolbar / action-row component + dropdown panel chrome.',
	},
	nav: {
		name: 'nav',
		tokens: {
			required: [
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
		},
		animated: true,
		notes:
			'<nav> carries sidebar rail, breadcrumb, and pagination patterns. Sub-namespaces declared under --set-nav-{breadcrumb,pagination}-*.',
	},
	output: {
		name: 'output',
		tokens: {
			prefix: 'toast',
			required: [
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
		},
		animated: false, // _output.scss has no own duration token; motion lives in composables/_toast.scss
		notes:
			'<output popover> becomes a toast. Tokens live under --set-toast-* (filename names the element; namespace names the surface).',
	},
	'role-group': {
		name: 'role-group',
		tokens: { required: ['border-width'] },
		animated: false,
		notes:
			'ARIA [role=group] / [role=toolbar] component. Minimal contract — most chrome flows from descendant elements.',
	},
	search: {
		name: 'search',
		tokens: {
			required: [
				'color',
				'background-color',
				'padding-inline',
				'padding-block',
				'gap',
				'transition-duration',
			],
		},
		animated: true,
		notes: 'Search-bar wrapper component.',
	},

	// ── Class-component primitives ─────────────────────────────────────────
	avatar: {
		name: 'avatar',
		tokens: {
			required: ['size', 'color', 'background-color', 'border-radius', 'font-size', 'font-weight'],
		},
		animated: false,
		notes: '.avatar — circular identity chip (initials or image).',
	},
	badge: {
		name: 'badge',
		tokens: {
			required: [
				'color',
				'background-color',
				'border-radius',
				'padding-inline',
				'padding-block',
				'font-size',
				'font-weight',
				'line-height',
			],
		},
		animated: false,
		notes: '.badge — inline pill for counts and status keywords.',
	},
	div: {
		name: 'div',
		tokens: { prefix: 'stack', required: ['gap'] },
		animated: false,
		notes:
			'.stack and .cluster class-component primitives carried by <div>. Additional --set-cluster-* prefix via FILE_EXCEPTIONS.',
	},
	dot: {
		name: 'dot',
		tokens: { required: ['size', 'background-color', 'pulse-duration', 'pulse-easing'] },
		animated: true,
		notes: '.dot — colored circle indicator (status / presence).',
	},
	skeleton: {
		name: 'skeleton',
		tokens: {
			required: [
				'background-color',
				'highlight-color',
				'border-radius',
				'duration',
				'line-block-size',
				'line-gap',
			],
		},
		animated: true,
		notes: '.skeleton — loading placeholder with animated shimmer.',
	},
	spinner: {
		name: 'spinner',
		tokens: { required: ['size', 'color', 'border-width', 'duration'] },
		animated: true,
		notes: '.spinner — animated loading indicator.',
	},
	tag: {
		name: 'tag',
		tokens: {
			required: [
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
		},
		animated: true,
		notes: '.tag — chip label with optional close affordance.',
	},
}

/** Read the component contract for a partial basename. */
export function componentContractFor(name: string): ComponentContract | null {
	return COMPONENT_CONTRACTS[name] ?? null
}

// ============================================================================
// Composable contracts
// ============================================================================
//
// Each file in `src/styles/composables/` paints chrome gated on state set
// by a `use{Name}` / `create{Name}` factory. Composables sit in the
// cascade between surfaces and modifiers — they BOTH declare new
// composable-scoped tokens AND override existing element / component /
// surface tokens to retune chrome for the composable's state.
//
// COMPOSABLE_CONTRACTS records the per-composable contract:
//
//   - `tokens.prefix` — primary new namespace the partial owns. Optional
//     (some composables, like `_tabs.scss`, declare no own tokens — they
//     only paint state-gated chrome reading from the element / component
//     layers).
//
//   - `tokens.required` — composable-scoped tokens the partial MUST
//     declare. Empty for behavior-only composables.
//
//   - `state.selectors` — the composable-state selector kinds the partial
//     MUST gate on. The contracts.test.ts check enforces "at least one"
//     state selector; this list enforces the specific vocabulary.
//
//   - `animated` — true when the partial paints `transition:` or
//     `animation:` declarations. Must invoke `@include transition()` or
//     `@include reduced-motion`.
//
//   - `factory` — the matching `create{Name}` / `use{Name}` pairing.
//     Already cross-checked by contracts.test.ts; recorded here for the
//     guides + the per-composable failure messages.

export interface ComposableContract {
	readonly name: string
	/** Token surface — same shape as SurfaceContract.tokens / ComponentContract.tokens. */
	readonly tokens: {
		readonly prefix?: string
		readonly required: readonly string[]
	}
	/** Composable-state gating selectors the partial uses (`[data-{name}-
	 *  *]`, `[aria-*=]`, `[role=]`, `[open]`, `:popover-open`, `:modal`,
	 *  `:open`). */
	readonly state: { readonly selectors: readonly string[] }
	readonly animated: boolean
	/** The matching `create{Name}` / `use{Name}` factory name. */
	readonly factory: string
	readonly notes: string
}

export const COMPOSABLE_CONTRACTS: Readonly<Record<string, ComposableContract>> = {
	aside: {
		name: 'aside',
		tokens: { required: [] },
		state: { selectors: [] },
		animated: false,
		factory: 'createAside',
		notes:
			'Behavior-only composable. Drawer geometry lives in components/_aside.scss; this partial is a placeholder so composables/ mirrors browser/composables/.',
	},
	carousel: {
		name: 'carousel',
		tokens: {
			prefix: 'carousel',
			required: [
				'block-size',
				'padding',
				'border-color',
				'border-radius',
				'transition-duration',
				'transition-easing',
				'control-size',
				'control-background-color',
				'control-icon',
				'indicator-size',
				'indicator-active-size',
				'indicator-background-color',
				'indicator-background-color-active',
			],
		},
		state: { selectors: ['aria-attribute', 'role-attribute'] },
		animated: true,
		factory: 'createCarousel',
		notes:
			'Carousel chrome — controls, indicators, slide transitions. Paints :aria-selected="true" active state.',
	},
	dialog: {
		name: 'dialog',
		tokens: { prefix: 'dialog', required: ['inline-size', 'max-block-size', 'max-inline-size'] },
		state: { selectors: ['pseudo-class', 'attribute'] },
		animated: false,
		factory: 'createDialog',
		notes:
			'Sizing extensions for dialog.scrollable[open] and dialog:modal. Motion lives on the element layer + popover surface.',
	},
	select: {
		name: 'select',
		tokens: {
			prefix: 'select',
			required: [
				'caret-min-inline-size',
				'max-inline-size',
				'menu-min-inline-size',
				'toggle-min-block-size',
				'toggle-padding-inline-end',
			],
		},
		state: { selectors: ['aria-attribute', 'data-attribute', 'attribute'] },
		animated: false,
		factory: 'createSelect',
		notes:
			'Combobox / listbox chrome. Toggle + menu + caret sizing reads from the element-layer --set-select-* surface.',
	},
	tabs: {
		name: 'tabs',
		tokens: { required: [] }, // tokens declared in components/_nav.scss under --set-tab-* and --set-tablist-*
		state: { selectors: ['aria-attribute', 'role-attribute'] },
		animated: false,
		factory: 'createTabs',
		notes:
			'Tab list chrome via [role="tablist"] / [role="tab"] / [aria-selected="true"]. Tokens declared in components/_nav.scss (via FILE_EXCEPTIONS); this partial paints state.',
	},
	toast: {
		name: 'toast',
		tokens: { prefix: 'toast', required: ['stack-offset'] },
		state: { selectors: ['pseudo-class', 'attribute', 'data-attribute'] },
		animated: true,
		factory: 'createToast',
		notes:
			'Toast deck stacking + animation chrome. Stack-offset is composable-managed (createToast.stack() writes the per-toast value inline); the element-layer --set-toast-* declares the static surface.',
	},
}

/** Read the composable contract for a partial basename. */
export function composableContractFor(name: string): ComposableContract | null {
	return COMPOSABLE_CONTRACTS[name] ?? null
}

// ============================================================================
// Interactive-element registry
// ============================================================================
//
// The framework paints focus / hover / disabled chrome on a specific, closed
// set of native HTML elements. Every member of this set is held to two
// accessibility-critical requirements, enforced by
// `tests/guides/patterns/interactive.test.ts`:
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

// ============================================================================
//  Motion contract — panel-reveal partials must reach for the framework's
//  `--set-motion-duration` + `--set-motion-timing-function` tokens.
//
//  The framework declares one shared pair of motion tokens for every
//  "substantial reveal" surface (see `src/styles/_tokens.scss` §
//  Framework-wide motion contract). The reference smoothness is
//  `<details>::details-content`'s native animation — height tweens
//  cleanly between 0 and `auto` because `<html>` declares
//  `interpolate-size: allow-keywords`; opacity fades alongside; the
//  discrete `content-visibility` flip uses
//  `transition-behavior: allow-discrete` so the element stays in the
//  render tree for the full close transition.
//
//  Every panel partial in `MOTION_CONTRACT_PARTIALS` matches that
//  contract — same duration, same iOS-stiff-decel curve, same
//  `allow-discrete` for discrete properties. Consumers retune both
//  tokens at `:root` to change every motion's feel at once, or per-
//  consumer (e.g. `dialog { --set-motion-duration: 400ms }`) to slow
//  one family. Drift happens when a partial author hardcodes a
//  numeric duration / curve directly — `0.25s ease` instead of
//  `var(--set-motion-duration) var(--set-motion-timing-function)`.
//  The parity test at `tests/guides/tokens.test.ts` scans each
//  registered partial and fails if the motion tokens are missing.
// ============================================================================

export interface MotionContractPartial {
	/** Path relative to `src/styles/` (e.g. `elements/_details.scss`). */
	readonly path: string
	/** One-sentence description of the panel motion the partial paints. */
	readonly reason: string
}

export const MOTION_CONTRACT_PARTIALS: readonly MotionContractPartial[] = [
	{
		path: 'elements/_details.scss',
		reason:
			'`<details>::details-content` block-size + opacity + content-visibility (reference behavior).',
	},
	{
		path: 'elements/_summary.scss',
		reason: 'Summary trailing-margin transition — locked to the details body height-collapse rate.',
	},
	{
		path: 'elements/_dialog.scss',
		reason: 'Modal / non-modal open / close — opacity + transform + overlay + display.',
	},
	{
		path: 'elements/_table.scss',
		reason:
			'`[data-table-expansion-panel]` block-size + padding-block + opacity (sibling-row disclosure).',
	},
	{
		path: 'components/_aside.scss',
		reason:
			'Drawer slide-in (transform + opacity + overlay + display) AND alert open / close (block-size + opacity + visibility).',
	},
]

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
	// The anti-pattern is "two or more :not()s chained on ONE simple
	// selector" (e.g. `[popover]:not(a):not(b)`). Two :not()s spread
	// across different branches of a selector list (`a:not(x), b:not(x)`)
	// are NOT chained — each branch keeps its own :not() at single
	// specificity. Split branches respecting paren-depth before counting.
	const branches: string[] = []
	let depth = 0
	let start = 0
	for (let i = 0; i < selector.length; i += 1) {
		const ch = selector[i]
		if (ch === '(' || ch === '[') depth += 1
		else if (ch === ')' || ch === ']') depth = Math.max(0, depth - 1)
		else if (ch === ',' && depth === 0) {
			branches.push(selector.slice(start, i))
			start = i + 1
		}
	}
	branches.push(selector.slice(start))

	// Per-branch check: 2+ :not(tag) or :not([attr]) sequences on a
	// single simple selector. Pseudo-class :not() chains are exempt.
	const NOT_TAG_OR_ATTR = /:not\((?:[a-z][a-z0-9-]*|\[[^\]]+\])\)/g
	for (const branch of branches) {
		const matches = branch.match(NOT_TAG_OR_ATTR) ?? []
		if (matches.length >= 2) return true
	}
	return false
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

// ============================================================================
//  Structural pairings — `parent > child` element-pair allowlist.
//
//  A framework rule of the form `parent > child` (where both ends are
//  bare tag names) blesses one HTML element as the structural marker
//  for that role inside a container. Some pairings are unavoidable —
//  HTML spec requires them (`tr > td`, `details > summary`); some are
//  documented framework slots filled by the universally-natural element
//  (`article > header:first-child` for the card band, `dialog > header`
//  for the modal title band).
//
//  But many candidate pairings would be element-hardcoding inside
//  containment: arbitrary picks of one element type as a chrome
//  trigger inside an otherwise-generic container. Example caught and
//  reverted: `body:has(main) > nav > search` (paint a pinned filter
//  row when a `<search>` lands inside a body-shell nav rail). `<search>`
//  is one of many elements that could be pinned; baking the framework
//  rule against it forces every consumer to use exactly `<search>`.
//
//  STRUCTURAL_PAIRINGS records the allowed pairings. Each entry names a
//  reason category:
//
//    'spec'    — HTML spec mandates this nesting; no other child can
//                fulfill the role (e.g., `tr > td`, `picture > source`).
//
//    'slot'    — The parent is a card/dialog/drawer-shaped container
//                with a DOCUMENTED slot, filled by the universally-
//                natural semantic element (`article > header:first-child`
//                for the card band — Bootstrap parity).
//
//    'reset'   — The rule strips a UA default that only exists for that
//                child element type, or zeroes a baseline value carried
//                by the child element (`nav > ul` strips list-marker
//                gutter; `main > section` zeroes section's own
//                padding-block under the nesting-collapse contract).
//
//    'context' — The child element gets contextual chrome because of
//                its position inside the parent's documented internal
//                structure (`header > button:last-child` is the dismiss
//                button trail inside an alert / drawer header band).
//
//  Tests at `tests/guides/patterns/pairings.test.ts` enforce the allowlist
//  across every compiled framework rule. New `parent > child` pairings
//  must be added here with a justification (or refactored to a wrapper
//  class / element baseline that doesn't hardcode the child element).
// ============================================================================

export type StructuralPairingKind = 'spec' | 'slot' | 'reset' | 'context'

export interface StructuralPairing {
	/** The parent tag name (e.g., `nav`, `article`, `tr`). */
	readonly parent: string
	/** The child tag name (e.g., `header`, `td`, `section`). */
	readonly child: string
	/** Reason category — see kind docstrings above. */
	readonly kind: StructuralPairingKind
	/** One-sentence justification, surfaced in test failures. */
	readonly reason: string
}

export const STRUCTURAL_PAIRINGS: readonly StructuralPairing[] = [
	// ── 'spec' — HTML LS requires this nesting ───────────────────────────────
	{
		parent: 'details',
		child: 'summary',
		kind: 'spec',
		reason: 'HTML spec: <summary> is the disclosure trigger; only valid inside <details>.',
	},
	{
		parent: 'fieldset',
		child: 'legend',
		kind: 'spec',
		reason: 'HTML spec: <legend> can only live inside <fieldset>.',
	},
	{
		parent: 'picture',
		child: 'source',
		kind: 'spec',
		reason: 'HTML spec: <source> declares responsive variants for <picture>.',
	},
	{
		parent: 'picture',
		child: 'img',
		kind: 'spec',
		reason: 'HTML spec: <picture> wraps a fallback <img>.',
	},
	{
		parent: 'select',
		child: 'option',
		kind: 'spec',
		reason: 'HTML spec: <option> is the select choice element.',
	},
	{
		parent: 'select',
		child: 'optgroup',
		kind: 'spec',
		reason: 'HTML spec: <optgroup> groups options inside <select>.',
	},
	{
		parent: 'optgroup',
		child: 'option',
		kind: 'spec',
		reason: 'HTML spec.',
	},
	{
		parent: 'table',
		child: 'thead',
		kind: 'spec',
		reason: 'HTML spec.',
	},
	{
		parent: 'table',
		child: 'tbody',
		kind: 'spec',
		reason: 'HTML spec.',
	},
	{
		parent: 'table',
		child: 'tfoot',
		kind: 'spec',
		reason: 'HTML spec.',
	},
	{
		parent: 'table',
		child: 'caption',
		kind: 'spec',
		reason: 'HTML spec.',
	},
	{
		parent: 'table',
		child: 'colgroup',
		kind: 'spec',
		reason: 'HTML spec.',
	},
	{
		parent: 'table',
		child: 'tr',
		kind: 'spec',
		reason: 'HTML spec: <tr> rows can appear directly under <table> for thead-less tables.',
	},
	{
		parent: 'thead',
		child: 'tr',
		kind: 'spec',
		reason: 'HTML spec.',
	},
	{
		parent: 'tbody',
		child: 'tr',
		kind: 'spec',
		reason: 'HTML spec.',
	},
	{
		parent: 'tfoot',
		child: 'tr',
		kind: 'spec',
		reason: 'HTML spec.',
	},
	{
		parent: 'tr',
		child: 'td',
		kind: 'spec',
		reason: 'HTML spec: <td> data cells inside <tr>.',
	},
	{
		parent: 'tr',
		child: 'th',
		kind: 'spec',
		reason: 'HTML spec: <th> header cells inside <tr>.',
	},
	{
		parent: 'colgroup',
		child: 'col',
		kind: 'spec',
		reason: 'HTML spec.',
	},
	{
		parent: 'ol',
		child: 'li',
		kind: 'spec',
		reason: 'HTML spec: ordered-list items.',
	},
	{
		parent: 'ul',
		child: 'li',
		kind: 'spec',
		reason: 'HTML spec: unordered-list items.',
	},
	{
		parent: 'menu',
		child: 'li',
		kind: 'spec',
		reason: 'HTML spec: <menu> is a toolbar list of <li> command items.',
	},
	{
		parent: 'dl',
		child: 'dt',
		kind: 'spec',
		reason: 'HTML spec: description-term inside description-list.',
	},
	{
		parent: 'dl',
		child: 'dd',
		kind: 'spec',
		reason: 'HTML spec: description-detail inside description-list.',
	},
	// (`table.top > caption` / `table.bottom > caption` are covered by the
	// `table > caption` pairing above — `extractTagPairs` keys off the
	// `table` tag head, so no caption-side-specific entry is needed.)

	// ── 'slot' — documented framework slot, universal natural child ─────────
	{
		parent: 'article',
		child: 'header',
		kind: 'slot',
		reason: 'Card header band (article-owns-header; Bootstrap `.card-header` parity).',
	},
	{
		parent: 'article',
		child: 'footer',
		kind: 'slot',
		reason: 'Card footer band (Bootstrap `.card-footer` parity).',
	},
	{
		parent: 'article',
		child: 'img',
		kind: 'slot',
		reason: 'Card hero image (Bootstrap `.card-img-top`/`-bottom` parity, tag-driven).',
	},
	{
		parent: 'article',
		child: 'picture',
		kind: 'slot',
		reason: 'Card hero with responsive sources (paired with <img> fallback).',
	},
	{
		parent: 'article',
		child: 'nav',
		kind: 'slot',
		reason: 'In-card action group (documented composition in `_nav.scss`).',
	},
	{
		parent: 'article',
		child: 'ul',
		kind: 'slot',
		reason: 'Card-embedded list group (`.group` modifier).',
	},
	{
		parent: 'article',
		child: 'ol',
		kind: 'slot',
		reason: 'Card-embedded list group (`.group` modifier).',
	},
	{
		parent: 'dialog',
		child: 'header',
		kind: 'slot',
		reason: 'Modal header band (Bootstrap `.modal-header` parity).',
	},
	{
		parent: 'dialog',
		child: 'footer',
		kind: 'slot',
		reason: 'Modal footer band.',
	},
	{
		parent: 'dialog',
		child: 'form',
		kind: 'slot',
		reason:
			'HTML spec: <form method="dialog"> + the modal-form composition that hosts header/footer bands inside the form.',
	},
	{
		parent: 'nav',
		child: 'header',
		kind: 'slot',
		reason: 'Rail-local header (drawer band on mobile, sticky header on desktop).',
	},
	{
		parent: 'aside',
		child: 'header',
		kind: 'slot',
		reason: 'Rail-local header (drawer band on mobile, sticky header on desktop).',
	},
	{
		parent: 'aside',
		child: 'footer',
		kind: 'slot',
		reason: 'Alert / drawer footer band — trailing-actions row (parallel to aside > header).',
	},
	{
		parent: 'div',
		child: 'header',
		kind: 'slot',
		reason:
			'Toast header band — title + trailing dismiss row when the toast root (`<div role="status">`; the toast moved off `<output>` because it renders flow content `<output>`’s phrasing-only content model forbids) carries a `<header>` (parallel to aside-alert).',
	},
	{
		parent: 'div',
		child: 'footer',
		kind: 'slot',
		reason:
			'Toast footer band — trailing-actions row when the toast root (`<div role="status">`) carries a `<footer>` (parallel to aside-alert).',
	},
	{
		parent: 'div',
		child: 'button',
		kind: 'context',
		reason:
			'Trailing dismiss button in the toast body row (`<div role="status"> > button:last-child`) — variant-context reset paints it as a quiet icon regardless of host variant (parallel to aside-alert).',
	},
	{
		parent: 'nav',
		child: 'footer',
		kind: 'slot',
		reason: 'Drawer footer band on `<nav popover>` (parallel to nav > header).',
	},
	{
		parent: 'form',
		child: 'header',
		kind: 'slot',
		reason: 'Modal-form header band via `<dialog> > <form> > <header>` composition.',
	},
	{
		parent: 'form',
		child: 'footer',
		kind: 'slot',
		reason: 'Modal-form footer band via `<dialog> > <form> > <footer>` composition.',
	},
	{
		parent: 'form',
		child: 'section',
		kind: 'reset',
		reason:
			'Section nesting-collapse inside `<dialog> > <form> > <section>` (dialog.scrollable form variant).',
	},
	{
		parent: 'form',
		child: 'input',
		kind: 'slot',
		reason: '<input> is THE form-control element (HTML spec); form full-width input rule.',
	},
	{
		parent: 'form',
		child: 'textarea',
		kind: 'slot',
		reason: '<textarea> is a form-control element; form full-width input rule.',
	},
	{
		parent: 'form',
		child: 'select',
		kind: 'slot',
		reason: '<select> is a form-control element; form full-width input rule.',
	},
	{
		parent: 'label',
		child: 'input',
		kind: 'slot',
		reason:
			'Label-on-top stack: <label> wraps its form control (HTML spec: label associates with form controls).',
	},
	{
		parent: 'label',
		child: 'textarea',
		kind: 'slot',
		reason: 'Label-on-top stack: <label> wraps its form control.',
	},
	{
		parent: 'label',
		child: 'select',
		kind: 'slot',
		reason: 'Label-on-top stack: <label> wraps its form control.',
	},
	{
		parent: 'nav',
		child: 'h6',
		kind: 'slot',
		reason:
			'Grouped-sidebar eyebrow heading — <h6> + <menu> sibling-pair pattern documented in `_menu.scss`.',
	},
	{
		parent: 'aside',
		child: 'h6',
		kind: 'slot',
		reason: 'TOC-rail eyebrow heading — same h6 + menu pattern as nav rail.',
	},
	{
		parent: 'li',
		child: 'h6',
		kind: 'slot',
		reason:
			'Dropdown command-group label — `<menu>`’s content model permits only `<li>`, so the section `<h6>` is the first child of the group `<li>` (Bootstrap `.dropdown-header` parity).',
	},
	{
		parent: 'li',
		child: 'menu',
		kind: 'slot',
		reason:
			'Dropdown command group — a group `<li>` holds an optional `<h6>` label followed by a nested `<menu>` of that group’s command `<li>`s (conformant `<menu>` content model; replaces the spec-illegal bare `<h6>`/`<hr>` children).',
	},
	{
		parent: 'form',
		child: 'label',
		kind: 'slot',
		reason:
			'<label> is THE form-control caption element (HTML spec); the label-on-top stack is the universal form pattern.',
	},

	// ── 'reset' — UA default reset / nesting collapse ──────────────────────
	{
		parent: 'main',
		child: 'section',
		kind: 'reset',
		reason:
			'Section nesting-collapse: parent supplies vertical gutter, child drops own padding-block.',
	},
	{
		parent: 'section',
		child: 'section',
		kind: 'reset',
		reason: 'Section nesting-collapse.',
	},
	{
		parent: 'article',
		child: 'section',
		kind: 'reset',
		reason: 'Section nesting-collapse.',
	},
	{
		parent: 'nav',
		child: 'section',
		kind: 'reset',
		reason: 'Section nesting-collapse.',
	},
	{
		parent: 'aside',
		child: 'section',
		kind: 'reset',
		reason: 'Section nesting-collapse.',
	},
	{
		parent: 'dialog',
		child: 'section',
		kind: 'reset',
		reason: 'Section nesting-collapse + `dialog.scrollable` inner section as scroll container.',
	},
	{
		parent: 'nav',
		child: 'ol',
		kind: 'reset',
		reason: 'Strip UA list-marker gutter for navigation lists (breadcrumb, pagination, etc.).',
	},
	{
		parent: 'dialog',
		child: 'h1',
		kind: 'reset',
		reason: 'Zero heading margin inside a dialog body (dialog flex-column gap owns rhythm).',
	},
	{
		parent: 'dialog',
		child: 'h2',
		kind: 'reset',
		reason: 'Zero heading margin inside a dialog body (dialog flex-column gap owns rhythm).',
	},
	{
		parent: 'dialog',
		child: 'h3',
		kind: 'reset',
		reason: 'Zero heading margin inside a dialog body (dialog flex-column gap owns rhythm).',
	},
	{
		parent: 'dialog',
		child: 'h4',
		kind: 'reset',
		reason: 'Zero heading margin inside a dialog body (dialog flex-column gap owns rhythm).',
	},
	{
		parent: 'dialog',
		child: 'h5',
		kind: 'reset',
		reason: 'Zero heading margin inside a dialog body (dialog flex-column gap owns rhythm).',
	},
	{
		parent: 'dialog',
		child: 'h6',
		kind: 'reset',
		reason: 'Zero heading margin inside a dialog body (dialog flex-column gap owns rhythm).',
	},
	{
		parent: 'dialog',
		child: 'p',
		kind: 'reset',
		reason: 'Zero paragraph margin inside a dialog body (dialog flex-column gap owns rhythm).',
	},
	{
		parent: 'form',
		child: 'h1',
		kind: 'reset',
		reason:
			'Zero heading margin inside form-wrapped dialog body (form passes through dialog flex column).',
	},
	{
		parent: 'form',
		child: 'h2',
		kind: 'reset',
		reason:
			'Zero heading margin inside form-wrapped dialog body (form passes through dialog flex column).',
	},
	{
		parent: 'form',
		child: 'h3',
		kind: 'reset',
		reason:
			'Zero heading margin inside form-wrapped dialog body (form passes through dialog flex column).',
	},
	{
		parent: 'form',
		child: 'h4',
		kind: 'reset',
		reason:
			'Zero heading margin inside form-wrapped dialog body (form passes through dialog flex column).',
	},
	{
		parent: 'form',
		child: 'h5',
		kind: 'reset',
		reason:
			'Zero heading margin inside form-wrapped dialog body (form passes through dialog flex column).',
	},
	{
		parent: 'form',
		child: 'h6',
		kind: 'reset',
		reason:
			'Zero heading margin inside form-wrapped dialog body (form passes through dialog flex column).',
	},
	{
		parent: 'form',
		child: 'p',
		kind: 'reset',
		reason:
			'Zero paragraph margin inside form-wrapped dialog body (form passes through dialog flex column).',
	},
	{
		parent: 'article',
		child: 'h1',
		kind: 'reset',
		reason: 'Zero heading margin inside an article (article gap owns vertical rhythm).',
	},
	{
		parent: 'article',
		child: 'h2',
		kind: 'reset',
		reason: 'Zero heading margin inside an article (article gap owns vertical rhythm).',
	},
	{
		parent: 'article',
		child: 'h3',
		kind: 'reset',
		reason: 'Zero heading margin inside an article (article gap owns vertical rhythm).',
	},
	{
		parent: 'article',
		child: 'h4',
		kind: 'reset',
		reason: 'Zero heading margin inside an article (article gap owns vertical rhythm).',
	},
	{
		parent: 'article',
		child: 'h5',
		kind: 'reset',
		reason: 'Zero heading margin inside an article (article gap owns vertical rhythm).',
	},
	{
		parent: 'article',
		child: 'h6',
		kind: 'reset',
		reason: 'Zero heading margin inside an article (article gap owns vertical rhythm).',
	},
	{
		parent: 'article',
		child: 'p',
		kind: 'reset',
		reason: 'Zero paragraph margin inside an article (article gap owns vertical rhythm).',
	},
	{
		parent: 'header',
		child: 'h1',
		kind: 'reset',
		reason: 'Zero heading margin inside an article header band (band owns padding-block).',
	},
	{
		parent: 'header',
		child: 'h2',
		kind: 'reset',
		reason: 'Zero heading margin inside an article header band (band owns padding-block).',
	},
	{
		parent: 'header',
		child: 'h3',
		kind: 'reset',
		reason: 'Zero heading margin inside an article header band (band owns padding-block).',
	},
	{
		parent: 'header',
		child: 'h4',
		kind: 'reset',
		reason: 'Zero heading margin inside an article header band (band owns padding-block).',
	},
	{
		parent: 'header',
		child: 'h5',
		kind: 'reset',
		reason: 'Zero heading margin inside an article header band (band owns padding-block).',
	},
	{
		parent: 'header',
		child: 'h6',
		kind: 'reset',
		reason: 'Zero heading margin inside an article header band (band owns padding-block).',
	},
	{
		parent: 'header',
		child: 'p',
		kind: 'reset',
		reason: 'Zero paragraph margin inside an article header band (band owns padding-block).',
	},
	{
		parent: 'footer',
		child: 'h1',
		kind: 'reset',
		reason: 'Zero heading margin inside an article footer band (band owns padding-block).',
	},
	{
		parent: 'footer',
		child: 'h2',
		kind: 'reset',
		reason: 'Zero heading margin inside an article footer band (band owns padding-block).',
	},
	{
		parent: 'footer',
		child: 'h3',
		kind: 'reset',
		reason: 'Zero heading margin inside an article footer band (band owns padding-block).',
	},
	{
		parent: 'footer',
		child: 'h4',
		kind: 'reset',
		reason: 'Zero heading margin inside an article footer band (band owns padding-block).',
	},
	{
		parent: 'footer',
		child: 'h5',
		kind: 'reset',
		reason: 'Zero heading margin inside an article footer band (band owns padding-block).',
	},
	{
		parent: 'footer',
		child: 'h6',
		kind: 'reset',
		reason: 'Zero heading margin inside an article footer band (band owns padding-block).',
	},
	{
		parent: 'footer',
		child: 'p',
		kind: 'reset',
		reason: 'Zero paragraph margin inside an article footer band (band owns padding-block).',
	},
	{
		parent: 'nav',
		child: 'ul',
		kind: 'reset',
		reason: 'Strip UA list-marker gutter for navigation lists.',
	},
	{
		parent: 'body',
		child: 'header',
		kind: 'reset',
		reason: 'Body-grid placement (`grid-area: header`) — body layout shell.',
	},
	{
		parent: 'body',
		child: 'nav',
		kind: 'reset',
		reason: 'Body-grid placement (`grid-area: nav`).',
	},
	{
		parent: 'body',
		child: 'main',
		kind: 'reset',
		reason: 'Body-grid placement (`grid-area: main`).',
	},
	{
		parent: 'body',
		child: 'aside',
		kind: 'reset',
		reason: 'Body-grid placement (`grid-area: aside`).',
	},
	{
		parent: 'body',
		child: 'footer',
		kind: 'reset',
		reason: 'Body-grid placement (`grid-area: footer`).',
	},

	// ── 'context' — child-positional chrome inside parent's structure ──────
	{
		parent: 'header',
		child: 'button',
		kind: 'context',
		reason:
			'Trailing dismiss button in alert/drawer/dialog header band (`margin-inline-start: auto`).',
	},
	{
		parent: 'footer',
		child: 'button',
		kind: 'context',
		reason: 'Trailing dismiss button in alert/drawer/dialog footer band.',
	},
	{
		parent: 'li',
		child: 'button',
		kind: 'context',
		reason:
			'Menu items can be <button> (HTML spec: <menu> commands accept <button> as well as <a>).',
	},
	{
		parent: 'li',
		child: 'a',
		kind: 'context',
		reason:
			'Menu / nav-list items are <a> link rows by default (the other valid menu-command shape per HTML spec).',
	},
]

/** Index for O(1) `parent > child` allowlist lookup. */
export const PAIRING_INDEX: ReadonlyMap<string, StructuralPairing> = new Map(
	STRUCTURAL_PAIRINGS.map((p) => [`${p.parent}>${p.child}`, p]),
)

/** True when `parent > child` is on the allowlist. */
export function isAllowedTagPair(parent: string, child: string): boolean {
	return PAIRING_INDEX.has(`${parent}>${child}`)
}

/** Look up the allowlist entry for `parent > child`, if any. */
export function pairingFor(parent: string, child: string): StructuralPairing | null {
	return PAIRING_INDEX.get(`${parent}>${child}`) ?? null
}

/**
 * Extract every `(parent-tag, child-tag)` pair joined by a child combinator
 * (`>`) from a CSS selector. Handles selector lists (commas), descendant
 * vs. child combinators, and functional pseudos (`:is(...)` / `:where(...)`
 * flatten to their tag branches).
 *
 * Pieces that lack a tag head (classes, attributes, `*`, pseudos) generate
 * no pair. Only pairs where BOTH sides resolve to bare tag names are
 * returned — those are the cascade fights the framework can mis-name.
 *
 * Examples:
 *   'nav > header'                       → [{ parent: 'nav', child: 'header' }]
 *   'nav, aside > header'                → [{ parent: 'aside', child: 'header' }]
 *   ':is(nav, aside) > header'           → [{ parent: 'nav', child: 'header' },
 *                                            { parent: 'aside', child: 'header' }]
 *   'body:has(main) > nav > header'      → [{ parent: 'body', child: 'nav' },
 *                                            { parent: 'nav', child: 'header' }]
 *   'body:has(main) > * > header'        → [{ parent: 'body', child: '*'-> skipped },
 *                                            { parent: '*'-> skipped, child: 'header' }]
 *                                          → []  (universal heads skipped)
 *   '.foo > .bar'                        → []  (no tag heads)
 *   'article > header:first-child'       → [{ parent: 'article', child: 'header' }]
 */
export function extractTagPairs(selector: string): readonly { parent: string; child: string }[] {
	const out: { parent: string; child: string }[] = []
	for (const branch of splitTopLevel(selector, ',')) {
		const pieces = splitTopLevel(branch, '>')
		for (let i = 0; i < pieces.length - 1; i += 1) {
			const parents = trailingTagsOfCombinatorChain(pieces[i] ?? '')
			const children = leadingTagsOfCompound(pieces[i + 1] ?? '')
			for (const p of parents) for (const c of children) out.push({ parent: p, child: c })
		}
	}
	return out
}
