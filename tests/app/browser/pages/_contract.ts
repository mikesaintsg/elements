// ============================================================================
//  Showcase page-suite contract maps — the single source of truth the
//  pages meta-driver (`tests/app/core/pages.test.ts`) and the Phase-2
//  per-page parity files key off. The `src/browser/patterns.ts`-registry
//  analogue, scoped to the showcase.
//
//  Four declared maps (the showcase parity contract — guides/showcase.md §Contract):
//
//    PAGE_EXEMPTIONS      pages that demo no single framework artifact —
//                         exempt from Phase-2 *parity* only (they still
//                         pass the structural skeleton).
//    PAGE_SURFACE_BUNDLES legit one-page-covers-many: the page → the set
//                         of framework artifacts it bundles.
//    PAGE_H1_DEMO         pages allowed >1 `<h1>` because the page itself
//                         demonstrates the `<h1>` element. Every other
//                         page has exactly one (the intro) page-H1.
//    INTRO_ID_EXCEPTIONS  pages whose first-section id legitimately is not
//                         `{routeId}-intro`. Intentionally EMPTY — the
//                         convention is total (Phase-1 1D-d renamed the
//                         lone offender, HomePage `home` → `home-intro`).
//
//  Pure data + types. No node/Vue imports so both the node meta-driver
//  and any future consumer can import it freely.
// ============================================================================

/** Page basename without the `.vue` extension, e.g. `TokensPage`. */
export type PageName = string

/**
 * Pages that legitimately demonstrate no single framework artifact, so
 * Phase-2 down-stream parity (every registry key → a demo) does not
 * require them to map to an `elements.ts` / factory / contract key. They
 * STILL pass the Phase-1 structural skeleton — exemption is parity-only,
 * never a bijection hole.
 */
export const PAGE_EXEMPTIONS: ReadonlySet<PageName> = new Set([
	'HomePage', // narrative landing page — chrome demo, no single artifact
	'TypographyPage', // a sweep of ~two-dozen text tags, no single root
	'SectioningPage', // the sectioning-landmark sweep, no single root
])

/**
 * Legit one-page-covers-many. A page in this map is the canonical demo
 * for *every* listed artifact (element tag / surface / composable key).
 * Phase-2 down-stream parity resolves a registry key through this map
 * before declaring it undemoed.
 */
export const PAGE_SURFACE_BUNDLES: Readonly<Record<PageName, readonly string[]>> = {
	HeadingsPage: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'hgroup'],
	InlineAtomsPage: ['badge', 'dot', 'tag', 'spinner', 'skeleton'],
	MediaPage: [
		'img',
		'picture',
		'video',
		'audio',
		'canvas',
		'svg',
		'math',
		'iframe',
		'embed',
		'object',
	],
	// ~two dozen inline/block text tags — Phase 2 reconciles the exact set
	// against the page markup; this is the documented coverage intent.
	TypographyPage: [
		'p',
		'blockquote',
		'pre',
		'code',
		'kbd',
		'samp',
		'var',
		'mark',
		'small',
		'strong',
		'em',
		'b',
		'i',
		'u',
		's',
		'abbr',
		'cite',
		'q',
		'sub',
		'sup',
		'dfn',
		'time',
		'data',
		'address',
		'hr',
		'dl',
		'dt',
		'dd',
	],
	SectioningPage: [
		'main',
		'section',
		'article',
		'aside',
		'header',
		'footer',
		'nav',
		'search',
		'hgroup',
	],
	FormControlsPage: [
		'input',
		'textarea',
		'select',
		'datalist',
		'label',
		'fieldset',
		'legend',
		'output',
		'progress',
		'meter',
	],
	PopoverSurfacesPage: ['popover', 'anchor-position', 'backdrop'],
	FormSurfacesPage: ['focus', 'placeholder', 'marker', 'selection'],
	ScrollAndTransitionPage: ['scrollbar', 'view-transition'],
	UseThemeButtonPage: ['useTheme', 'useButton'],
	UseDragDropPage: ['useDrag', 'useDrop'],
	// Layout-template page. Composes useAside (sidebar drawer), useDialog
	// (view-source modal in ExamplesShell), useMenu (example picker), and
	// useTheme (toolbar light/dark toggle). The toolbar exercises the
	// `<menu role="toolbar">` pattern recognized by ATTR_ROOTED in
	// parity.test.ts §3.
	DashboardExamplePage: ['useAside', 'useDialog', 'useMenu', 'useTheme'],
}

/**
 * Pages allowed more than one `<h1>` because the page itself demonstrates
 * the `<h1>` element (the demo H1s are content, not page chrome). Every
 * page not in this set must have exactly one page-level `<h1>` — the
 * `<hgroup>` intro heading.
 */
export const PAGE_H1_DEMO: ReadonlySet<PageName> = new Set([
	'HeadingsPage', // demos <h1>–<h6>; renders real <h1> samples
])

/**
 * Pages whose first-section `id` is intentionally NOT `{routeId}-intro`.
 * EMPTY by design: the intro-id convention is total. Kept as an explicit
 * empty export so a future deviation is a conscious edit here, not a
 * silent skip in the driver.
 */
export const INTRO_ID_EXCEPTIONS: ReadonlySet<PageName> = new Set([])

/**
 * Framework modifier class names that were RENAMED for the single-word
 * convention (guides/modifiers.md §Anti-rules). No showcase page may
 * apply the old name — it no longer exists in `src/styles`, so a stale
 * usage would silently render unstyled. Append future renames here with
 * the new name in the comment.
 */
export const REMOVED_FRAMEWORK_MODIFIERS: ReadonlyMap<string, string> = new Map([
	['icon-only', 'compact'],
	['caption-top', 'top'],
	['caption-bottom', 'bottom'],
])
