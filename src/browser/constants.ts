import type {
	AttributeEnumDomain,
	AttributeIntegerBound,
	Placement,
	PresentationDefault,
	TableSortDirection,
} from './types.js'

// ============================================================================
//  Browser-side constants shared across composables / factories.
//
//  Three flavours live here:
//    1. Tunables — default delays, thresholds, and offsets that the
//       composables read at construction time (consumers can override).
//    2. Selectors — DOM queries used by composables to discover their own
//       moving parts (rows, items, focusable descendants).
//    3. Event-name maps — typed, namespaced `elements:{source}:{verb}`
//       strings dispatched as `CustomEvent`s. Authored as one map per
//       source so consumers can `addEventListener(BUTTON_EVENTS.toggle, …)`
//       without stringly typing.
//
//  Convention rules (see also `events.ts`):
//    - Every event name is prefixed `elements:` and uses lifecycle verbs
//      from the fixed vocabulary (show/open/hide/close, start/stop,
//      pause/resume, abort, destroy, select/deselect, focus/blur, etc.).
//    - `show` / `hide` are the cancellable pre-transition events
//      (`event.preventDefault()` aborts the transition); `open` / `close`
//      are the post-transition notifications.
//    - Source segments use the *element* name where the composable binds
//      to one (`dialog`, `details`, `popover`, `select`, `table`, `nav`,
//      `aside`, `menu`), and the composable noun otherwise (`drag`,
//      `theme`, `pointer`, `combo`).
// ============================================================================

// ── Tunables ────────────────────────────────────────────────────────────────

export const DEFAULT_HOVER_DELAY_MS = 600
export const DEFAULT_TOAST_DELAY_MS = 5000
/** Swipe-distance threshold (in CSS pixels) past which the toast commits to dismiss. */
export const DEFAULT_TOAST_SWIPE_THRESHOLD_PX = 80
export const DEFAULT_CAROUSEL_INTERVAL_MS = 5000
export const DEFAULT_FLOATING_OFFSET = 8
export const DEFAULT_MENU_OFFSET = 2
/** Default item-count threshold for `flip` on `useMenu` / `createMenu`.
 *  Mirrors the surface-layer popover gap: the menu reserves room for
 *  ~5 rows on the requested side; the browser's `position-try-fallbacks`
 *  flips it to the opposite block-axis side when that room is genuinely
 *  unavailable. Consumers can opt out with `flip: 0` — that branch
 *  removes the `max-block-size` cap and the `flip-block` fallback so the
 *  menu stays put and surplus rows scroll inside the panel. */
export const DEFAULT_MENU_FLIP = 5
/** Default item-count threshold for `flip` on `useSelect` /
 *  `createSelect`. Selects ARE expected to flip — a listbox anchored
 *  near the bottom of the viewport with no room below should reveal
 *  upwards rather than scroll an invisible portion. The threshold is
 *  the minimum row count that must fit on the requested side before
 *  the listbox commits to staying put. */
export const DEFAULT_SELECT_FLIP = 5
export const POPOVER_TOUCH_GUARD_MS = 50
export const DEFAULT_NAV_OFFSET_PX = 10
export const DEFAULT_NAV_THRESHOLD = 0.1
export const TRANSITION_FALLBACK_MS = 400
export const SWIPE_THRESHOLD_PX = 40
export const STORAGE_KEY_THEME = 'theme'

// ── DOM markers (data-attributes, no Bootstrap class soup) ─────────────────
//
// Element-IS-component philosophy: composables key off semantic tags and
// data-attributes rather than `.modal` / `.show` / `.fade` style classes.
// Every marker here is a `data-*` attribute that survives Tailwind/utility
// classes without colliding with author intent.

/** On `<body>` while any modal-style dialog/aside has scroll lock active. */
export const BODY_LOCKED_ATTR = 'data-elements-scroll-locked'

/** Stable identity attribute on each `<tr>`. */
export const TABLE_ROW_ID_ATTR = 'data-id'
/** Optional positional attribute on `<tr>` (legacy fallback for `data-id`). */
export const TABLE_ROW_INDEX_ATTR = 'data-index'
/** On `<tr>` when its expansion row is open. */
export const TABLE_EXPANDED_ATTR = 'data-table-expanded'
/** On the detail `<tr>` (sibling of data row). */
export const TABLE_EXPANSION_ATTR = 'data-table-expansion'
/** ARIA attribute managed on `<table>`. */
export const TABLE_ARIA_ROWCOUNT = 'aria-rowcount'
/** ARIA attribute managed on each `<tbody>` `<tr>`. */
export const TABLE_ARIA_ROWINDEX = 'aria-rowindex'
/** ARIA attribute managed on `<th data-key="...">`. */
export const TABLE_ARIA_SORT = 'aria-sort'
/** On `<table>` while pointer drag is actively resizing a column. */
export const TABLE_RESIZING_ATTR = 'data-table-resizing'
/** On `<table>` when column resize is enabled. */
export const TABLE_RESIZABLE_ATTR = 'data-table-resizable'

/** Toast deck container opt-in attribute (replaces `.toast-stack`). */
export const TOAST_STACK_ATTR = 'data-toast-stack'
/** On toasts beyond `--set-toast-stack-depth` — paired with `aria-hidden`. */
export const TOAST_STACK_HIDDEN_ATTR = 'data-toast-stack-hidden'
/** On the deck container while a child toast is running its close transition. */
export const TOAST_STACK_CLOSING_ATTR = 'data-toast-stack-closing'
/** On the container — count of toasts beyond `--set-toast-stack-depth`. */
export const TOAST_HIDDEN_COUNT_ATTR = 'data-toast-hidden-count'

/** Marker attribute added to filtered-out options in combobox mode. */
export const SELECT_HIDDEN_ATTR = 'data-hidden'
/** Attribute on each option row that carries its value. Required — the
 *  factory cannot derive a value from text content because labels can
 *  contain whitespace, icons, or rich markup. */
export const SELECT_VALUE_ATTR = 'data-value'

// ── Selectors (semantic-element first; data-attribute second) ──────────────

/** Direct option rows inside a `<menu>` / dropdown panel. Anything
 *  semantically interactive (list items, anchors, buttons) qualifies. */
export const MENU_ITEM_SELECTOR =
	':where(li, a, button):not([disabled]):not([aria-disabled="true"])'

/** Combobox candidate list inside a select listbox. Same semantics as
 *  menu items but without the disabled exclusion (filtering, not focus). */
export const COMBO_ITEM_SELECTOR = ':where(li, a, button)'

/** Option rows inside a `<select>` listbox. UNLIKE `MENU_ITEM_SELECTOR`,
 *  which catches every interactive descendant (`<li>` + `<a>` + `<button>`),
 *  the select selector targets only ELEMENTS THAT CARRY A VALUE
 *  (`[data-value]`). The narrowing matters because:
 *
 *    1. Combobox markup wraps the filter `<input>` in a non-value-bearing
 *       `<li class="select-search">` row at the top of the menu. With the
 *       broader menu-item selector, the search row matched as an "item":
 *       click handlers ran `closest(SELECT_ITEM_SELECTOR)` against the
 *       input target, walked up to the `<li>`, found NO `data-value`,
 *       and silently returned. Selecting the FIRST visible item on
 *       open / after filter then anchored the active descendant on the
 *       search row instead of the first real option, breaking arrow-key
 *       roving and Enter-to-select.
 *    2. Standard option markup is `<li><button data-value="x">…</button></li>`.
 *       The broader selector matched BOTH the wrapping `<li>` AND the
 *       inner `<button>`, so every option was counted twice in
 *       `items()` / `visibleItems()` lists. Roving with arrow keys
 *       advanced through the duplicates, sometimes landing on a `<li>`
 *       wrapper (no `data-value`) before the matching `<button>` —
 *       Enter against the active `<li>` got `value === null` and did
 *       nothing.
 *
 *  Mailbox solves the same problem with `.dropdown-item:not(.disabled)`
 *  (class-scoped, one element per option). The `[data-value]` gate is
 *  the elements-flavoured equivalent — every option already carries the
 *  attribute (the factory cannot derive a value from text content; see
 *  `SELECT_VALUE_ATTR`), so existing markup keeps working unchanged. */
export const SELECT_ITEM_SELECTOR = `[${SELECT_VALUE_ATTR}]:not([disabled]):not([aria-disabled="true"])`

/** Focus-trap candidate selector. Used by `useDialog`, `useAside`, and
 *  `useFocus`. */
export const FOCUSABLE_SELECTOR =
	'[autofocus], input:not([disabled]), button:not([disabled]), a[href], select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/** ScrollSpy section discovery — any element with a stable id. */
export const NAV_SECTION_SELECTOR = '[id]'
/** ScrollSpy link discovery inside a `<nav>`. */
export const NAV_LINK_SELECTOR = 'a'

/** Tab triggers inside a `[role="tablist"]` wrapper. */
export const TAB_TRIGGER_SELECTOR = '[role="tab"]'

/** Carousel items: direct `[role="listitem"]` children of the carousel
 *  region (or `<li>` for plain markup). */
export const CAROUSEL_ITEM_SELECTOR =
	':scope > :where([role="list"], ol, ul) > :where([role="listitem"], li)'
/** Carousel indicator buttons inside the indicator group. The buttons
 *  are wrapped in `<li>` because `<menu role="tablist">` is a list element
 *  (matches the documented markup contract + `composables/_carousel.scss`'s
 *  `.carousel-indicators > li > button` chrome). */
export const CAROUSEL_INDICATOR_SELECTOR = ':scope > [role="tablist"] > li > button'

// ── Inspector attribute-family corpus bounds (Phase 3.2) ───────────────────
//
// The W3C-corpus-stated integer ranges and global enumerated-attribute
// keyword domains the `attribute` rule family (`src/browser/inspector/
// rules.ts`) enforces via the `@elements/core` `parseInteger` / `parseEnum`
// parsers. These are spec CONSTANTS the cards state in prose — NOT
// per-element schema `AttributeRule` data (the `AttributeRule` shape carries
// no integer-range field, and `tabindex`/`dir`/`contenteditable`/`inputmode`
// are GLOBAL attributes with no single owning element entry). They live here
// (the §5 module-data home, modelled on `PLACEMENT_AREAS`) and are bound
// back to the corpus prose BIDIRECTIONALLY by `tests/guides/w3c.test.ts`
// (each `cite` resolves, each bound/keyword appears verbatim in the cited
// card / chapter) so they can never become a hidden allowlist — the same
// corpus-is-source-of-truth discipline the schema `cite` is held to.

/** Every integer-valued attribute the corpus bounds, with its spec range.
 *  `tabindex` is global (no `tags`) and unbounded ("a valid integer",
 *  interactions.md §6.6.3); the table bounds are verbatim from the
 *  `colgroup`/`col`/`td`/`th` cards (tables.md). */
export const ATTRIBUTE_INTEGER_BOUNDS: readonly AttributeIntegerBound[] = [
	{ attribute: 'tabindex', cite: 'interactions#the-tabindex-attribute' },
	{
		attribute: 'span',
		min: 1,
		max: 1000,
		tags: ['colgroup', 'col'],
		cite: 'tables#the-colgroup-element',
	},
	{ attribute: 'colspan', min: 1, max: 1000, tags: ['td', 'th'], cite: 'tables#the-td-element' },
	{ attribute: 'rowspan', min: 0, max: 65534, tags: ['td', 'th'], cite: 'tables#the-td-element' },
] as const

/** Every global enumerated attribute whose closed keyword domain the corpus
 *  cards STATE. `loading`/`crossorigin` are deliberately ABSENT — the corpus
 *  prose says only "limited to only known values", never the keyword set, so
 *  encoding a domain would invent one (the spec-faithfulness rule). */
export const ATTRIBUTE_ENUM_DOMAINS: readonly AttributeEnumDomain[] = [
	// `dir`'s global {ltr,rtl,auto} domain is corpus-stated by the UA
	// stylesheet's `[dir=ltr i], [dir=rtl i], [dir=auto i]` selectors
	// (renderings.md §15.3.5 Bidirectional text) — the only place the cache
	// cards the closed keyword set (no prose `dir` chapter exists; the
	// `bdo[dir]∈{ltr,rtl}` narrower domain is the carded schema AttributeRule).
	{ attribute: 'dir', values: ['ltr', 'rtl', 'auto'], cite: 'renderings#bidirectional-text' },
	{
		attribute: 'contenteditable',
		values: ['true', 'false', 'plaintext-only'],
		empty: true,
		cite: 'interactions#making-document-regions-editable-the-contenteditable-content-attribute',
	},
	{
		attribute: 'inputmode',
		values: ['none', 'text', 'tel', 'url', 'email', 'numeric', 'decimal', 'search'],
		cite: 'interactions#input-modalities-the-inputmode-attribute',
	},
] as const

// ── Presentation-lens load-bearing computed-style defaults (Phase 5) ───────
//
// The `presentation` rule family's TABULAR core (list-item / bidi /
// table-model / preformatted) is corpus DATA, mirroring the
// `ATTRIBUTE_INTEGER_BOUNDS` precedent EXACTLY: a `readonly` typed array with
// a `cite` field, the type in `types.ts`, and a STRENGTHENED bidirectional
// binding in `tests/guides/w3c.test.ts` (each `cite` resolves through the
// `renderings` chapter path; each `property: expected` UA declaration appears
// VERBATIM in the cited `renderings.md §15` block). The rules ITERATE this
// data — no per-element `if (tag==='li')` branch — and fire ONLY when
// `getComputedStyle(el).{property}` is OUTSIDE `expected` AND no
// corpus-sanctioned ARIA `roles` compensation is present (the
// false-positive-on-valid-markup guard, designed from the `aria.md`
// implicit-role prose, never intuition).
//
// `colgroup` / `col` are DELIBERATELY excluded from the table-model entry:
// the corpus `aria.md` §112 cards them as *no corresponding role* — they
// expose NO accessibility semantic a `display` override could strip, so
// flagging them would be a structural false positive that contradicts the
// ROADMAP non-goal ("only flags overrides that contradict an element's
// semantics, nothing stylistic"). The role-bearing table elements
// (`table`/`caption`/`thead`/`tbody`/`tfoot`/`tr`/`td`/`th`) ARE covered,
// each compensable by the exact implicit role the corpus `aria.md` §110-116
// cards for it. `bidi` carries no `roles` — `aria.md` §85 cards `bdo`/`bdi`
// as *no corresponding role*, so no role can carry directional-override
// semantics; its false-positive guard is the narrow `expected` set plus the
// rule's `dir`/element precondition (rules.ts).

/** Every load-bearing computed-style default the §15 UA stylesheet sets
 *  whose override strips a semantic. Verbatim from `renderings.md`: `li`
 *  §15.3.7, `bdo`/`bdi`/`[dir]` §15.3.5, the table model §15.3.8, `pre`
 *  §15.3.3 (the `pre[wrap]` presentational-hint `pre-wrap` is an accepted
 *  member — it preserves the preformatted semantic). ARIA `roles`
 *  compensation per `aria.md` §110-168. */
export const PRESENTATION_DEFAULTS: readonly PresentationDefault[] = [
	// list-item — `li { display: list-item }` (renderings.md §15.3.7).
	// Compensated by an explicit `role="listitem"` (aria.md §60 — the
	// implicit `li` role; an author re-asserting it preserves the semantic).
	{
		tags: ['li'],
		property: 'display',
		expected: ['list-item'],
		roles: ['listitem'],
		severity: 'error',
		cite: 'renderings#lists',
	},
	// bidi — `bdo, bdo[dir] { unicode-bidi: isolate-override }` and the
	// `bdi` / `[dir=…]` `{ unicode-bidi: isolate }` rules (§15.3.5). No ARIA
	// role carries bidi-override semantics (aria.md §85).
	{
		tags: ['bdo'],
		property: 'unicode-bidi',
		expected: ['isolate-override'],
		severity: 'error',
		cite: 'renderings#bidirectional-text',
	},
	{
		tags: ['bdi'],
		property: 'unicode-bidi',
		expected: ['isolate'],
		severity: 'error',
		cite: 'renderings#bidirectional-text',
	},
	// table model — `renderings.md §15.3.8`. Each role-bearing element
	// compensable by the exact implicit ARIA role `aria.md §110-116` cards
	// for it (so a `display:block` table that re-asserts `role="table"` etc.
	// is conformant — the framework/grid-library false-positive guard).
	{
		tags: ['table'],
		property: 'display',
		expected: ['table'],
		// Only `table` — the corpus `aria.md` §110 cards `<table>`→`table`
		// (NOT `grid`/`treegrid`; encoding those would invent a compensation
		// the corpus does not state — the spec-faithfulness rule).
		roles: ['table'],
		severity: 'error',
		cite: 'renderings#tables',
	},
	{
		tags: ['caption'],
		property: 'display',
		expected: ['table-caption'],
		roles: ['caption'],
		severity: 'error',
		cite: 'renderings#tables',
	},
	{
		tags: ['thead'],
		property: 'display',
		expected: ['table-header-group'],
		roles: ['rowgroup'],
		severity: 'error',
		cite: 'renderings#tables',
	},
	{
		tags: ['tbody'],
		property: 'display',
		expected: ['table-row-group'],
		roles: ['rowgroup'],
		severity: 'error',
		cite: 'renderings#tables',
	},
	{
		tags: ['tfoot'],
		property: 'display',
		expected: ['table-footer-group'],
		roles: ['rowgroup'],
		severity: 'error',
		cite: 'renderings#tables',
	},
	{
		tags: ['tr'],
		property: 'display',
		expected: ['table-row'],
		roles: ['row'],
		severity: 'error',
		cite: 'renderings#tables',
	},
	{
		tags: ['td'],
		property: 'display',
		expected: ['table-cell'],
		roles: ['cell', 'gridcell'],
		severity: 'error',
		cite: 'renderings#tables',
	},
	{
		tags: ['th'],
		property: 'display',
		expected: ['table-cell'],
		roles: ['columnheader', 'rowheader', 'cell', 'gridcell'],
		severity: 'error',
		cite: 'renderings#tables',
	},
	// preformatted — `pre { white-space: pre }` (§15.3.3); the `pre[wrap]`
	// presentational hint resolves `pre-wrap`, which STILL preserves the
	// preformatted semantic, so both are conformant. No ARIA role carries
	// preformatting (aria.md §56 — `pre` is *generic*); the guard is the
	// narrow `expected` set.
	{
		tags: ['pre'],
		property: 'white-space',
		expected: ['pre', 'pre-wrap'],
		severity: 'error',
		cite: 'renderings#flow-content',
	},
] as const

// ── Popover side vocabulary ────────────────────────────────────────────────

export const POPOVER_SIDES: readonly string[] = ['top', 'end', 'bottom', 'start']
export const POPOVER_SIDE_SET: ReadonlySet<string> = new Set(POPOVER_SIDES)

// ── Event name maps ────────────────────────────────────────────────────────
//
// Per-domain namespaced DOM event names.
// Convention: `elements:{source}:{verb}` — lowercase, colon-separated.
// Cancelable events (show, hide, slide, prevent) honour `event.preventDefault()`.

export const ALERT_EVENTS = {
	show: 'elements:alert:show',
	open: 'elements:alert:open',
	hide: 'elements:alert:hide',
	close: 'elements:alert:close',
} as const

export const BUTTON_EVENTS = { toggle: 'elements:button:toggle' } as const

export const CAROUSEL_EVENTS = {
	slide: 'elements:carousel:slide',
	change: 'elements:carousel:change',
	pause: 'elements:carousel:pause',
	resume: 'elements:carousel:resume',
} as const

/** Renamed from `COLLAPSE_EVENTS`. Bound to the native `<details>` element. */
export const DETAILS_EVENTS = {
	show: 'elements:details:show',
	open: 'elements:details:open',
	hide: 'elements:details:hide',
	close: 'elements:details:close',
	deactivate: 'elements:details:deactivate',
} as const

export const COMBO_EVENTS = {
	open: 'elements:combo:open',
	close: 'elements:combo:close',
	select: 'elements:combo:select',
	clear: 'elements:combo:clear',
	input: 'elements:combo:input',
	create: 'elements:combo:create',
} as const

export const DRAG_EVENTS = {
	tap: 'elements:drag:tap',
	start: 'elements:drag:start',
	over: 'elements:drag:over',
	drop: 'elements:drag:drop',
	end: 'elements:drag:end',
	reorder: 'elements:drag:reorder',
} as const

/** Renamed from `DROPDOWN_EVENTS`. Bound to the native `<menu>` element. */
export const MENU_EVENTS = {
	show: 'elements:menu:show',
	open: 'elements:menu:open',
	hide: 'elements:menu:hide',
	close: 'elements:menu:close',
} as const

export const FORM_EVENTS = {
	change: 'elements:form:change',
	formdata: 'elements:form:formdata',
	input: 'elements:form:input',
	invalid: 'elements:form:invalid',
	reset: 'elements:form:reset',
	submit: 'elements:form:submit',
	validate: 'elements:form:validate',
} as const

/** Renamed from `MODAL_EVENTS`. Bound to the native `<dialog>` element. */
export const DIALOG_EVENTS = {
	show: 'elements:dialog:show',
	open: 'elements:dialog:open',
	hide: 'elements:dialog:hide',
	close: 'elements:dialog:close',
	prevent: 'elements:dialog:prevent',
} as const

/** Renamed from `OFFCANVAS_EVENTS`. Bound to the native `<aside>` element. */
export const ASIDE_EVENTS = {
	show: 'elements:aside:show',
	open: 'elements:aside:open',
	hide: 'elements:aside:hide',
	close: 'elements:aside:close',
} as const

export const POPOVER_EVENTS = {
	show: 'elements:popover:show',
	open: 'elements:popover:open',
	hide: 'elements:popover:hide',
	close: 'elements:popover:close',
	place: 'elements:popover:place',
} as const

/** Renamed from `SCROLLSPY_EVENTS`. Bound to the native `<nav>` element. */
export const NAV_EVENTS = { activate: 'elements:nav:activate' } as const

export const SELECT_EVENTS = {
	show: 'elements:select:show',
	open: 'elements:select:open',
	hide: 'elements:select:hide',
	close: 'elements:select:close',
	select: 'elements:select:select',
	clear: 'elements:select:clear',
	input: 'elements:select:input',
} as const

/** Renamed from `TAB_EVENTS`. Bound to a `[role="tablist"]` wrapper. */
export const TABS_EVENTS = {
	show: 'elements:tabs:show',
	open: 'elements:tabs:open',
	hide: 'elements:tabs:hide',
	close: 'elements:tabs:close',
	deactivate: 'elements:tabs:deactivate',
} as const

export const TABLE_EVENTS = {
	change: 'elements:table:change',
	focus: 'elements:table:focus',
	select: 'elements:table:select',
	sort: 'elements:table:sort',
	expand: 'elements:table:expand',
	collapse: 'elements:table:collapse',
	paginate: 'elements:table:paginate',
} as const

export const THEME_EVENTS = { change: 'elements:theme:change' } as const

export const TOAST_EVENTS = {
	show: 'elements:toast:show',
	open: 'elements:toast:open',
	hide: 'elements:toast:hide',
	close: 'elements:toast:close',
} as const

export const TOOLTIP_EVENTS = {
	show: 'elements:tooltip:show',
	open: 'elements:tooltip:open',
	hide: 'elements:tooltip:hide',
	close: 'elements:tooltip:close',
	place: 'elements:tooltip:place',
} as const

export const TREE_EVENTS = {
	expand: 'elements:tree:expand',
	collapse: 'elements:tree:collapse',
	select: 'elements:tree:select',
	move: 'elements:tree:move',
} as const

// The semantic Inspector (ROADMAP Phase 4) is a dev-tool analyzer ENTITY,
// not a UI composable/component painting CSS chrome. It follows the same
// `elements:{source}:{verb}` CustomEvent idiom (AGENTS §14) and the same
// `emit` / `bindEventMap` plumbing every `create*` factory uses, but its
// constant lives HERE only — it is deliberately NOT mirrored into the
// `events.ts` composable tree (that tree + its `composables.test.ts`
// vocabulary gate are the composable/component public CSS-parity surface;
// the inspector is a distinct entity class). One inspection pass dispatches
// exactly `start` → `finding`* → `done` on the inspected root element.
export const INSPECTOR_EVENTS = {
	start: 'elements:inspector:start',
	finding: 'elements:inspector:finding',
	done: 'elements:inspector:done',
} as const

/** The closed {@link FindingSeverity} value set (types.ts is the type
 *  truth; this is its runtime tuple — drives the `FindingManager`
 *  severity-vs-lens argument discrimination and severity-keyed counts). */
export const FINDING_SEVERITIES = ['error', 'warning', 'advice'] as const

/** The closed {@link RuleLens} value set (the runtime tuple of the
 *  types.ts union) — the `FindingManager` uses it to tell a `lens`
 *  filter argument apart from a `severity` one. */
export const RULE_LENSES = ['structure', 'presentation'] as const

// ── Relocated impl-file constants ───────────────────────────────────────────

/** Shared frozen-empty reactive sentinels. Composables fall back to these
 *  when their backing factory is absent so a "no data yet" computed keeps a
 *  STABLE referential identity across re-evaluations — reactive consumers
 *  treat an unchanged reference as "nothing changed" and skip re-render.
 *  `readonly never[]` / `ReadonlySet<never>` are assignable to any
 *  `readonly T[]` / `ReadonlySet<T>` (`never` is the bottom type), so a
 *  single instance can back every typed empty without a cast. Never mutated. */
export const EMPTY_ARRAY: readonly never[] = []
export const EMPTY_SET: ReadonlySet<never> = new Set<never>()

/** Selector for the dismiss control inside an alert. Authors mark a
 *  child element with this attribute (typically a `<button>`); a click on
 *  any descendant triggers `hide()`. Replaces Bootstrap's `.btn-close`. */
export const ALERT_DISMISS_SELECTOR = '[data-alert-dismiss]'

/** State classes the factory writes onto each `[data-index]` row.
 *  Authors hook these for visual feedback in their own CSS. */
export const DRAG_ROW_CLASSES: readonly string[] = [
	'dragging',
	'selected',
	'drop-target',
	'drop-indicator',
	'drop-indicator-before',
	'drop-indicator-after',
] as const

/** `[data-form-validated]` is set on the form once `check()` / `report()` /
 *  `submit` has run. Replaces Bootstrap's `.was-validated` class — same
 *  contract, attribute-based for our element-IS-component model. */
export const FORM_VALIDATED_ATTR = 'data-form-validated'

// Inner panel selector — the expansion `<tr>`'s `<td>` carries one element
// flagged with `[data-table-expansion-panel]` that owns visibility. Replaces
// the previous Bootstrap `.collapse` class soup.
export const PANEL_ATTR = 'data-table-expansion-panel'
export const PANEL_SELECTOR = `[${PANEL_ATTR}]`
export const RESIZE_HANDLE_ATTR = 'data-table-resize-handle'
export const RESIZE_HANDLE_SELECTOR = `thead th [${RESIZE_HANDLE_ATTR}]`
export const ARIA_SORT_VALUE: Record<TableSortDirection, string> = {
	asc: 'ascending',
	desc: 'descending',
	none: 'none',
}

/** All kebab-case segments containing no abbreviations and no digits-only segments. */
export const SEGMENT = '[a-z][a-z0-9]*'

// CSS `position-area` value per `Placement`. Single-side variants stay
// centered; aligned variants use `span-*` so the panel keeps a flat edge
// against the anchor (`bottom-start` = below + start-aligned, not the corner
// cell). Logical `start` / `end` map to physical `left` / `right` because
// Chromium's `position-area` parser only accepts the physical keywords today.
export const PLACEMENT_AREAS: Readonly<Record<Placement, string>> = {
	top: 'top',
	'top-start': 'top span-right',
	'top-end': 'top span-left',
	bottom: 'bottom',
	'bottom-start': 'bottom span-right',
	'bottom-end': 'bottom span-left',
	end: 'right',
	'end-start': 'right span-bottom',
	'end-end': 'right span-top',
	start: 'left',
	'start-start': 'left span-bottom',
	'start-end': 'left span-top',
}

// `align-self` / `justify-self` per `Placement`. Mirrors mailbox's
// `$placements` map in `_mixins.scss`. The surface default
// (`align-self: start; justify-self: anchor-center`) only happens to be
// correct for the `'bottom'` placement — every aligned placement
// (`bottom-start`, `top-end`, etc.) needs an explicit override or it
// inherits the surface default and visually CENTERS on the anchor or
// drifts to the wrong edge of the position-area band. Composables write
// these inline alongside `position-area` so the placement contract is
// self-contained per panel.
export const PLACEMENT_SELFS: Readonly<Record<Placement, readonly [string, string]>> = {
	top: ['end', 'anchor-center'],
	'top-start': ['end', 'start'],
	'top-end': ['end', 'end'],
	bottom: ['start', 'anchor-center'],
	'bottom-start': ['start', 'start'],
	'bottom-end': ['start', 'end'],
	end: ['anchor-center', 'start'],
	'end-start': ['start', 'start'],
	'end-end': ['end', 'start'],
	start: ['anchor-center', 'end'],
	'start-start': ['start', 'end'],
	'start-end': ['end', 'end'],
}
