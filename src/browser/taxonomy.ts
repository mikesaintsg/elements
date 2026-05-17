import { SEGMENT } from './constants.js'

// ============================================================================
// HTML Taxonomy Registry (TS mirror)
//
// One entry per native HTML element the framework has an opinion on. Each
// entry carries:
//
//   - tag           the HTML tag name (lowercase, no chevrons)
//   - category      MDN content category — the same buckets guides/elements.md
//                   uses for grouping. Useful for filtering ("every form
//                   control", "every inline-text element").
//   - treatment     how the framework styles it:
//                     'substantive'    — has --set-{tag}-* tokens; in elements.ts
//                     'reset'          — partial normalizes UA defaults, no tokens
//                     'composable'     — substantive + paired with use{Name}
//                     'passthrough'    — framework has no opinion (UA only)
//   - composable    when treatment === 'composable', the matching use{Name}
//                     factory key (e.g. 'useDialog'). null otherwise.
//
// Source of truth: guides/elements.md §3. The parity test at
// tests/guides/elements.test.ts fails when:
//   - an entry's treatment is 'substantive' or 'composable' but no
//     --set-{tag}-* token is declared anywhere in src/styles/ (elements/
//     or components/) for that tag;
//   - an entry's treatment is 'composable' but no factory with the named
//     key exists in factories/;
//   - an entry's tag has no matching _{tag}.scss partial in elements/
//     (every native tag the taxonomy enumerates must at least exist as a
//     partial, even if it's a passthrough stub — that's the contract that
//     keeps the partials inventory complete);
//   - the elements.ts list (substantive baselines living in elements/_*.scss
//     specifically) contains a tag not enumerated here.
//
// Note: a tag's substantive token declaration can live either in
// src/styles/elements/_{tag}.scss (recorded in elements.ts) or in
// src/styles/components/_{tag}.scss (not in elements.ts). The taxonomy's
// 'substantive' treatment covers both — it answers "does the framework
// declare tokens for this tag?", independent of which folder owns them.
//
// Adding a new element: add the row to guides/elements.md §3 first (so the
// design intent is documented), then mirror it here, then create the SCSS
// partial. The parity tests close the loop.
// ============================================================================

export type ElementCategory =
	| 'main-root'
	| 'sectioning-root'
	| 'content-sectioning'
	| 'text-content'
	| 'inline-text'
	| 'image-multimedia'
	| 'embedded-content'
	| 'demarcating-edits'
	| 'table-content'
	| 'forms'
	| 'interactive'
	| 'class-component'

export type ElementTreatment = 'substantive' | 'reset' | 'composable' | 'passthrough'

export interface TaxonomyEntry {
	readonly tag: string
	readonly category: ElementCategory
	readonly treatment: ElementTreatment
	/** `use{Name}` factory key when treatment === 'composable'. */
	readonly composable: string | null
}

// ── Helper: factor out the boilerplate so adding rows stays a one-liner ────

function entry(
	tag: string,
	category: ElementCategory,
	treatment: ElementTreatment,
	composable: string | null = null,
): TaxonomyEntry {
	return { tag, category, treatment, composable }
}

// ── Registry ────────────────────────────────────────────────────────────────
//
// Alphabetical within each category — matches the catalog order in
// guides/elements.md §3 so the docs/code diff is a clean visual map.

export const taxonomy: readonly TaxonomyEntry[] = [
	// §3.1 Main root + sectioning root
	entry('html', 'main-root', 'reset'),
	entry('body', 'sectioning-root', 'reset'),

	// §3.2 Content sectioning
	entry('address', 'content-sectioning', 'substantive'),
	entry('article', 'content-sectioning', 'substantive'),
	entry('aside', 'content-sectioning', 'composable', 'useAside'),
	entry('footer', 'content-sectioning', 'substantive'),
	entry('header', 'content-sectioning', 'substantive'),
	entry('h1-h6', 'content-sectioning', 'reset'),
	entry('hgroup', 'content-sectioning', 'substantive'),
	entry('main', 'content-sectioning', 'substantive'),
	entry('nav', 'content-sectioning', 'composable', 'useNav'),
	entry('search', 'content-sectioning', 'substantive'),
	entry('section', 'content-sectioning', 'substantive'),

	// §3.3 Text content
	entry('blockquote', 'text-content', 'substantive'),
	entry('dd', 'text-content', 'substantive'),
	entry('div', 'text-content', 'passthrough'),
	entry('dl', 'text-content', 'substantive'),
	entry('dt', 'text-content', 'substantive'),
	entry('figcaption', 'text-content', 'substantive'),
	entry('figure', 'text-content', 'substantive'),
	entry('hr', 'text-content', 'substantive'),
	entry('li', 'text-content', 'reset'),
	entry('menu', 'text-content', 'composable', 'useMenu'),
	entry('ol', 'text-content', 'reset'),
	entry('p', 'text-content', 'reset'),
	entry('pre', 'text-content', 'substantive'),
	entry('ul', 'text-content', 'reset'),

	// §3.4 Inline text semantics
	entry('a', 'inline-text', 'substantive'),
	entry('abbr', 'inline-text', 'reset'),
	entry('b', 'inline-text', 'reset'),
	entry('bdi', 'inline-text', 'passthrough'),
	entry('bdo', 'inline-text', 'passthrough'),
	entry('cite', 'inline-text', 'passthrough'),
	entry('code', 'inline-text', 'substantive'),
	entry('data', 'inline-text', 'substantive'),
	entry('dfn', 'inline-text', 'passthrough'),
	entry('em', 'inline-text', 'passthrough'),
	entry('i', 'inline-text', 'reset'),
	entry('kbd', 'inline-text', 'substantive'),
	entry('mark', 'inline-text', 'substantive'),
	entry('q', 'inline-text', 'passthrough'),
	entry('rp', 'inline-text', 'passthrough'),
	entry('rt', 'inline-text', 'passthrough'),
	entry('ruby', 'inline-text', 'passthrough'),
	entry('s', 'inline-text', 'passthrough'),
	entry('samp', 'inline-text', 'substantive'),
	entry('small', 'inline-text', 'substantive'),
	entry('span', 'inline-text', 'passthrough'),
	entry('strong', 'inline-text', 'substantive'),
	entry('sub', 'inline-text', 'reset'),
	entry('sup', 'inline-text', 'reset'),
	entry('time', 'inline-text', 'substantive'),
	entry('u', 'inline-text', 'substantive'),
	entry('var', 'inline-text', 'substantive'),

	// §3.5 Image and multimedia
	entry('audio', 'image-multimedia', 'substantive'),
	entry('img', 'image-multimedia', 'reset'),
	entry('picture', 'image-multimedia', 'reset'),
	entry('video', 'image-multimedia', 'substantive'),

	// §3.6 Embedded content
	entry('canvas', 'embedded-content', 'substantive'),
	entry('embed', 'embedded-content', 'substantive'),
	entry('iframe', 'embedded-content', 'substantive'),
	entry('math', 'embedded-content', 'substantive'),
	entry('object', 'embedded-content', 'substantive'),
	entry('svg', 'embedded-content', 'substantive'),

	// §3.7 Demarcating edits
	entry('del', 'demarcating-edits', 'passthrough'),
	entry('ins', 'demarcating-edits', 'passthrough'),

	// §3.8 Table content
	entry('caption', 'table-content', 'passthrough'),
	entry('col', 'table-content', 'passthrough'),
	entry('colgroup', 'table-content', 'passthrough'),
	entry('table', 'table-content', 'composable', 'useTable'),
	entry('tbody', 'table-content', 'passthrough'),
	entry('td', 'table-content', 'passthrough'),
	entry('tfoot', 'table-content', 'passthrough'),
	entry('th', 'table-content', 'passthrough'),
	entry('thead', 'table-content', 'passthrough'),
	entry('tr', 'table-content', 'passthrough'),

	// §3.9 Forms
	entry('button', 'forms', 'composable', 'useButton'),
	entry('datalist', 'forms', 'passthrough'),
	entry('fieldset', 'forms', 'substantive'),
	entry('form', 'forms', 'composable', 'useForm'),
	entry('input', 'forms', 'substantive'),
	entry('label', 'forms', 'substantive'),
	entry('legend', 'forms', 'substantive'),
	entry('meter', 'forms', 'substantive'),
	entry('optgroup', 'forms', 'passthrough'),
	entry('option', 'forms', 'passthrough'),
	entry('output', 'forms', 'composable', 'useToast'),
	entry('progress', 'forms', 'substantive'),
	entry('select', 'forms', 'composable', 'useSelect'),
	entry('textarea', 'forms', 'substantive'),

	// §3.10 Interactive elements
	entry('details', 'interactive', 'composable', 'useDetails'),
	entry('dialog', 'interactive', 'composable', 'useDialog'),
	entry('summary', 'interactive', 'substantive'),
] as const

// ── Indices ─────────────────────────────────────────────────────────────────
// Pre-computed lookups so consumers don't `.find()` every call.

export const TAXONOMY_BY_TAG: ReadonlyMap<string, TaxonomyEntry> = new Map(
	taxonomy.map((row) => [row.tag, row]),
)

export const SUBSTANTIVE_TAGS: ReadonlySet<string> = new Set(
	taxonomy.filter((row) => row.treatment === 'substantive').map((row) => row.tag),
)

export const COMPOSABLE_TAGS: ReadonlySet<string> = new Set(
	taxonomy.filter((row) => row.treatment === 'composable').map((row) => row.tag),
)

export const RESET_TAGS: ReadonlySet<string> = new Set(
	taxonomy.filter((row) => row.treatment === 'reset').map((row) => row.tag),
)

export const PASSTHROUGH_TAGS: ReadonlySet<string> = new Set(
	taxonomy.filter((row) => row.treatment === 'passthrough').map((row) => row.tag),
)

/** Tags that consume the modifier system (substantive + composable). */
export const MODIFIABLE_TAGS: ReadonlySet<string> = new Set([
	...SUBSTANTIVE_TAGS,
	...COMPOSABLE_TAGS,
])

// ── Predicates ──────────────────────────────────────────────────────────────
// Single-word entity getters, per AGENTS.md §4.

/** True when the tag is enumerated in the taxonomy. */
export function isKnownTag(tag: string): boolean {
	return TAXONOMY_BY_TAG.has(tag)
}

/** True when the tag carries `--set-{tag}-*` tokens (no composable pairing). */
export function isSubstantive(tag: string): boolean {
	return SUBSTANTIVE_TAGS.has(tag)
}

/** True when the tag is paired with a `use{Name}` / `create{Name}` factory. */
export function isComposable(tag: string): boolean {
	return COMPOSABLE_TAGS.has(tag)
}

/** True when the framework only normalizes UA defaults on the tag. */
export function isReset(tag: string): boolean {
	return RESET_TAGS.has(tag)
}

/** True when the framework leaves the tag entirely alone. */
export function isPassthrough(tag: string): boolean {
	return PASSTHROUGH_TAGS.has(tag)
}

/** True when the tag is a valid host for the cross-cutting modifier system. */
export function isModifiable(tag: string): boolean {
	return MODIFIABLE_TAGS.has(tag)
}

/** Read the taxonomy entry for a tag, or `null` if unknown. */
export function describeTag(tag: string): TaxonomyEntry | null {
	return TAXONOMY_BY_TAG.get(tag) ?? null
}

// ============================================================================
// Token-name conventions + uniformity groups
// ============================================================================
//
// Two contracts live below:
//
//   1. NAMING — every `--set-*` custom property the framework declares MUST
//      follow a specific shape. The regexes encode the contract; the test at
//      tests/guides/tokens.test.ts scans every SCSS partial and fails
//      on any declaration that doesn't match one of the patterns.
//
//   2. UNIFORMITY — elements that play the same role (e.g. form controls,
//      page-shell sections, inline text chips) MUST expose the same
//      customizability surface. If `<input>` ships `--set-input-color` but
//      `<select>` does not ship `--set-select-color`, a consumer who wants
//      to retune all form controls has to special-case one. The
//      TOKEN_GROUPS table below names the groups and the minimum token
//      property suffix each member must declare. The test at
//      tests/guides/elements.test.ts loads the compiled cascade and
//      verifies every member resolves every required suffix.
//
// Both contracts are designed to be append-only — adding a new group or a
// new naming pattern only ever tightens the surface. Existing tags do not
// have to opt in retroactively because the test is scoped to enumerated
// group members; tags not in any group are not policed by uniformity.

// ── Naming patterns ─────────────────────────────────────────────────────────
//
// A `--set-*` token name is one of:
//
//   A. ELEMENT-SCOPED   `--set-{tag}-{property...}`
//                       tag must match a known taxonomy entry; property
//                       must be one or more kebab-case segments.
//
//   B. CONTEXT          `--set-{dimension}-{property...}`
//                       dimension must be one of variant, size, style,
//                       state, placement. variant additionally permits a
//                       `-subtle-` or `-on-canvas-` infix.
//
//   C. FRAMEWORK        `--set-{name}`
//                       name is a single kebab-case identifier or a
//                       `{name}-{property}` pair for tokens declared at
//                       :root without an element scope (focus, motion,
//                       transition, spacing, density, radius, z-index,
//                       elevation, icon, floater, anchor, … see
//                       tokens.ts § "Framework defaults that have no
//                       Tailwind equivalent").

/** Element-scoped token regex: `--set-{tag}-{property...}`. */
export const TOKEN_NAME_ELEMENT = new RegExp(`^--set-(${SEGMENT})-(${SEGMENT}(?:-${SEGMENT})*)$`)

/** Context-scoped token regex: `--set-{dimension}-{property...}`. */
export const TOKEN_NAME_CONTEXT = new RegExp(
	`^--set-(variant|size|style|state|placement)(?:-(?:subtle|on-canvas))?-(${SEGMENT}(?:-${SEGMENT})*)$`,
)

/** Framework-scoped token regex: `--set-{name}-{property...}` (no leading tag). */
export const TOKEN_NAME_FRAMEWORK = /^--set-[a-z][a-z0-9-]*$/

/**
 * Abbreviation black-list. Per AGENTS.md §20 the framework spells every name
 * out; these are the canonical offenders that have historically slipped in
 * via copy-paste from Bootstrap / Tailwind sources. A token name fails the
 * naming test when any of its hyphen-separated segments exactly equals one
 * of these strings. (Real HTML tag names like `nav` and real CSS keywords
 * like `min` / `max` are deliberately NOT on this list — abbreviation
 * checking is segment-equal, not substring-contains.)
 */
export const FORBIDDEN_TOKEN_SEGMENTS: ReadonlySet<string> = new Set([
	'bg', // background — write 'background' or 'background-color'
	'fg', // foreground — write 'color'
	'lg', // large — write 'large'
	'sm', // small — write 'small'
	'md', // medium — write 'medium' (and reconsider, since bare element = medium)
	'xl', // extra-large — write 'huge' (not shipped) or use Tailwind
	'info', // information — the variant spells out
	'btn', // button — write 'button'
	'hdr', // header — write 'header'
	'ftr', // footer — write 'footer'
	'qty', // quantity
	'amt', // amount
	'msg', // message
	'pos', // position
	'idx', // index
	'temp', // temporary
	'tmp', // temporary
])

// ── Uniformity groups ───────────────────────────────────────────────────────

export type TokenGroup =
	| 'interactive'
	| 'form-control'
	| 'page-shell'
	| 'card-region'
	| 'floating-surface'
	| 'inline-chip'
	| 'disclosure'
	| 'media-embed'
	| 'progress-indicator'
	| 'numeric-data'
	| 'boxed-container'
	| 'class-chip'

export interface TokenGroupDefinition {
	/** Token property suffixes every member must declare (after the `--set-{tag}-` prefix). */
	readonly required: readonly string[]
	/** Element / class names that make up the group. */
	readonly members: readonly string[]
}

export const TOKEN_GROUPS: Readonly<Record<TokenGroup, TokenGroupDefinition>> = {
	// Every interactive element (the set in `INTERACTIVE_ELEMENTS` —
	// elements that paint focus / hover / disabled chrome) must expose
	// `--set-{tag}-transition-duration` so consumers can retune state
	// animation centrally. This is the universal interactive minimum;
	// element-specific contracts (form controls, disclosure, etc.) extend
	// it through their own groups.
	interactive: {
		members: [
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
		],
		required: ['transition-duration'],
	},

	// Native form controls — every one of these is a `<input>` / `<textarea>`
	// / `<select>` / `<button>` peer. Customizability contract: a consumer
	// who wants to retune all form controls must be able to do so with a
	// single token override per member.
	'form-control': {
		members: ['button', 'input', 'textarea', 'select'],
		required: [
			'color',
			'background-color',
			'border-color',
			'border-width',
			'border-radius',
			'padding-inline',
			'padding-block',
			'font-size',
			'transition-duration',
			'cursor',
		],
	},

	// Page-shell sectioning — the elements promoted to the body grid.
	// The group is a UNIFORM shell-theming vocabulary: every body-grid
	// slot exposes the same `--set-{tag}-{color, background-color,
	// padding-inline, padding-block}` surface so a consumer themes the
	// entire shell with one consistent API (`--set-header-*`,
	// `--set-nav-*`, … `--set-main-*`) rather than a different knob per
	// slot.
	//
	// `main` belongs here as the CONTENT slot — deliberately, not as a
	// "minimum to satisfy the contract" shim. Its required tokens are
	// fully meaningful: `padding-inline`/`padding-block` are the fluid
	// content gutter + page rhythm; `color`/`background-color` are the
	// optional tinted-content-well override hook. The DEFAULTS differ
	// per slot (the bands/rails paint a backplate from their component
	// layer; `<main>` defaults to see-through — `currentColor` /
	// `transparent` — because the content well should read the body
	// canvas unless a consumer opts into a tint). Splitting `main` into
	// its own contract was considered and rejected: it would fragment
	// the one-vocabulary-for-the-whole-shell consumer API for no gain.
	'page-shell': {
		members: ['header', 'footer', 'nav', 'aside', 'main'],
		required: ['color', 'background-color', 'padding-inline', 'padding-block'],
	},

	// Card regions — `<article>` and its header/footer/aside children share
	// the same surface tokens for tinting, edge, padding.
	'card-region': {
		members: ['article'],
		required: [
			'color',
			'background-color',
			'border-color',
			'border-width',
			'border-radius',
			'padding-inline',
			'padding-block',
			'gap',
		],
	},

	// Floating surfaces — share the dialog / output-as-toast geometry
	// contract (color, bg, border, radius, padding, transition). The
	// pseudo-surface popover (`[popover]` selector, no native tag) shares
	// the same token namespace but isn't enumerable as a tag, so it's
	// covered by surfaces/_popover.scss tests rather than this group.
	'floating-surface': {
		members: ['dialog', 'output'],
		required: [
			'color',
			'background-color',
			'border-color',
			'border-width',
			'border-radius',
			'padding-inline',
			'padding-block',
			'transition-duration',
		],
	},

	// Inline text chips — the monospaced / highlighted runs sharing a chip
	// silhouette. Every member ships its own background + padding + radius
	// so the chip reads as deliberate.
	'inline-chip': {
		members: ['code', 'kbd', 'samp', 'var', 'mark'],
		required: ['color', 'background-color', 'padding-inline', 'padding-block', 'border-radius'],
	},

	// Disclosure (details + summary) — the disclosure surface and its
	// trigger share a transition duration so the marker rotation and the
	// content reveal stay paired.
	disclosure: {
		members: ['details', 'summary'],
		required: ['transition-duration'],
	},

	// Embedded media — `<video>` / `<iframe>` / `<embed>` / `<object>` /
	// `<canvas>` / `<svg>`. Each MUST expose `--set-{tag}-max-inline-size`
	// so consumers retune the viewport-containment cap with one override
	// per element. `<audio>` is intentionally absent: its native chrome is
	// narrow and the framework uses `inline-size: 100%` to fill the slot
	// (it's NOT a wide-element capped at the container; it's a small-
	// element stretched). `<img>` + `<picture>` are reset-only (no token
	// surface) — UA `max-width: 100%` is already correct without consumer
	// customization. `<math>` is text-shaped, not embed-shaped, so it
	// uses a font-family token instead.
	'media-embed': {
		members: ['video', 'iframe', 'embed', 'object', 'canvas', 'svg'],
		required: ['max-inline-size'],
	},

	// Progress indicators — `<progress>` (determinate) + `<meter>` (gauge).
	// Both repaint UA appearance into a track + fill chrome with shared
	// vocabulary: same `block-size` thickness, same pill-shaped
	// `border-radius`, same `track-color` for the empty channel, same
	// `transition-duration` for the fill animation. (The fill colors
	// diverge — `progress` uses one variant-tinted fill; `meter` uses
	// three thresholded colors for optimum / sub-optimum / even-less-
	// good — so fill-color isn't a uniform-required suffix.)
	'progress-indicator': {
		members: ['progress', 'meter'],
		required: ['block-size', 'border-radius', 'track-color', 'transition-duration'],
	},

	// Inline numeric annotations — `<data value>` (machine-readable values)
	// and `<time datetime>` (date / time labels). Both opt into
	// `font-variant-numeric: tabular-nums` so columns of figures align in
	// data-dense layouts. One shared required suffix per member; consumers
	// retune both at `:root` to switch the family to `oldstyle-nums` or
	// `proportional-nums` in one move.
	'numeric-data': {
		members: ['data', 'time'],
		required: ['font-variant-numeric'],
	},

	// Boxed in-flow containers — `<fieldset>` (form grouping) +
	// `<details>` (disclosure widget). Different semantic intent but the
	// same visual contract: a contained box with explicit border + padding
	// + radius, transition-duration on color shifts. Bare `<fieldset>` and
	// bare `<details>` paint identically — both lean on the same UA-reset
	// + framework chrome pattern. The contract enforces parity so a future
	// boxed-container addition can't silently ship without a border or
	// radius token. `<article>` is its own (`card-region`) group because
	// it also requires a `gap` token for card-stack rhythm.
	'boxed-container': {
		members: ['fieldset', 'details'],
		required: [
			'color',
			'background-color',
			'border-color',
			'border-width',
			'border-radius',
			'padding-inline',
			'padding-block',
			'transition-duration',
		],
	},

	// Class-component chips — `.badge` + `.tag` (carried by `<span>`).
	// Both render as inline pills with consumer-facing chip vocabulary:
	// color, background-color, border-radius, padding (inline + block),
	// font-size. The parallel `inline-chip` group covers SEMANTIC inline
	// text atoms (`<code>` / `<kbd>` / `<samp>` / `<var>` / `<mark>`) —
	// chip-shaped but tag-driven, not class-applied. Splitting the two
	// keeps the conceptual lines clean while enforcing the same shape on
	// both sides.
	'class-chip': {
		members: ['badge', 'tag'],
		required: [
			'color',
			'background-color',
			'border-radius',
			'padding-inline',
			'padding-block',
			'font-size',
		],
	},
}

/** Inverted lookup: tag → groups it belongs to. */
export const GROUPS_BY_TAG: ReadonlyMap<string, readonly TokenGroup[]> = (() => {
	const map = new Map<string, TokenGroup[]>()
	for (const [name, definition] of Object.entries(TOKEN_GROUPS) as readonly [
		TokenGroup,
		TokenGroupDefinition,
	][]) {
		for (const member of definition.members) {
			const list = map.get(member) ?? []
			list.push(name)
			map.set(member, list)
		}
	}
	return map
})()

/** Read the groups a tag belongs to (empty array if none). */
export function groupsForTag(tag: string): readonly TokenGroup[] {
	return GROUPS_BY_TAG.get(tag) ?? []
}
