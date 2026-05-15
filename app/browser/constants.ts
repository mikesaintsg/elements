import type { Placement, Variant } from '@elements/browser'
import { modifiers } from '@elements/browser'
import type {
	ModifierPlacement,
	ModifierSizeOption,
	ModifierSizeRow,
	ModifierStateOption,
	ModifierStyleOption,
	TableIssue,
	TablesAudit,
	TablesLog,
	TablesMember,
	TablesOrder,
	TablesReleaseStep,
	TablesThemeToken,
	TokenIcon,
} from './types.js'

/**
 * Static, non-reactive showcase constants: shell configuration plus the
 * variant vocabularies the demo pages iterate over. The vocabularies are
 * DERIVED from the framework's own `modifiers.variant` map — the showcase
 * never maintains its own copy of the framework's variant names, so the
 * two can't drift.
 */

// ── Shell configuration ─────────────────────────────────────────────────

/**
 * Mobile breakpoint. Mirrors the framework's `960px` rail breakpoint so
 * the shell can toggle the `popover` attribute on the rails in JS in
 * lockstep with the CSS-side drawer chrome.
 */
export const MOBILE_QUERY = '(max-width: 960px)'

/**
 * IDs of the two body-shell rail elements (`<nav>` left, `<aside>`
 * right). Used to close any open rail drawer on navigation / home.
 */
export const RAIL_IDS = ['primary-rail', 'toc-rail'] as const

/** Selector for the sidebar filter input focused by the `/` shortcut. */
export const FILTER_SELECTOR = '#sidebar-filter'

/**
 * `rootMargin` for the on-this-page IntersectionObserver. The `-70%`
 * bottom inset means a section counts as "active" only once it has
 * scrolled into the top third of the scroller.
 */
export const OBSERVER_ROOT_MARGIN = '0px 0px -70% 0px'

// ── Variant vocabularies (derived from @elements/browser) ────────────────

/**
 * The full framework variant vocabulary, in canonical declaration order
 * (`primary → information`). Single source of truth for every demo page
 * that iterates all seven variants.
 */
export const VARIANTS: readonly Variant[] = Object.values(modifiers.variant)

/**
 * Alert demo subset — every variant except `tertiary` (alerts don't use
 * the lowest-emphasis neutral tier).
 */
export const VARIANTS_ALERT: readonly Variant[] = VARIANTS.filter((v) => v !== 'tertiary')

/**
 * Form demo subset — every variant except `information` (the form demos
 * pair each control with an actionable status, not an informational one).
 */
export const VARIANTS_FORM: readonly Variant[] = VARIANTS.filter((v) => v !== 'information')

/**
 * Feedback-surface subset — `primary` plus the four status colors, no
 * neutral `secondary` / `tertiary`. Used by the form-surface and carousel
 * demos where every swatch must carry a semantic message.
 */
export const VARIANTS_FEEDBACK: readonly Variant[] = VARIANTS.filter(
	(v) => v !== 'secondary' && v !== 'tertiary',
)

// ── Placement vocabulary ─────────────────────────────────────────────────

/**
 * Every floating-panel placement, in the order the popover / menu demos
 * present them (each side, then its two alignment corners). Typed against
 * the framework's `Placement` union so an invalid value fails to compile.
 */
export const PLACEMENTS: readonly Placement[] = [
	'top',
	'top-start',
	'top-end',
	'bottom',
	'bottom-start',
	'bottom-end',
	'start',
	'start-start',
	'start-end',
	'end',
	'end-start',
	'end-end',
]

// ── Demo media assets ────────────────────────────────────────────────────
//
// Inline SVG data URIs + public sample-media URLs used by the image /
// figure / card / media demos. Inlined so the showcase stays offline-
// friendly; real consumers point at their own asset pipeline. Each is a
// distinct artwork (different viewBox / palette) — NOT interchangeable.

/** ArticleCardPage hero banner (800×400, emerald→cyan). */
export const ARTICLE_CARD_HERO_URI =
	"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 400'%3E%3Cdefs%3E%3ClinearGradient id='h' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0%25' stop-color='%23059669'/%3E%3Cstop offset='100%25' stop-color='%230891b2'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='800' height='400' fill='url(%23h)'/%3E%3Ccircle cx='180' cy='120' r='60' fill='white' fill-opacity='0.22'/%3E%3Ccircle cx='620' cy='280' r='90' fill='white' fill-opacity='0.15'/%3E%3Cpath d='M0 300 L200 220 L400 270 L600 200 L800 240 L800 400 L0 400 Z' fill='white' fill-opacity='0.20'/%3E%3C/svg%3E"

/** ArticleCardPage portrait thumbnail (400×400, pink→orange). */
export const ARTICLE_CARD_PORTRAIT_URI =
	"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 400'%3E%3Cdefs%3E%3ClinearGradient id='p' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0%25' stop-color='%23db2777'/%3E%3Cstop offset='100%25' stop-color='%23ea580c'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='400' height='400' fill='url(%23p)'/%3E%3Ccircle cx='200' cy='160' r='70' fill='white' fill-opacity='0.30'/%3E%3Cpath d='M70 400 L200 240 L330 400 Z' fill='white' fill-opacity='0.22'/%3E%3C/svg%3E"

/** ArticleCardPage cosmic feature image (800×400, violet radial). */
export const ARTICLE_CARD_COSMIC_URI =
	"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 400'%3E%3Cdefs%3E%3CradialGradient id='c' cx='30%25' cy='40%25' r='80%25'%3E%3Cstop offset='0%25' stop-color='%237c3aed'/%3E%3Cstop offset='60%25' stop-color='%231e293b'/%3E%3Cstop offset='100%25' stop-color='%23020617'/%3E%3C/radialGradient%3E%3C/defs%3E%3Crect width='800' height='400' fill='url(%23c)'/%3E%3Ccircle cx='180' cy='130' r='45' fill='white' fill-opacity='0.35'/%3E%3Ccircle cx='600' cy='80' r='2' fill='white'/%3E%3Ccircle cx='680' cy='180' r='1.5' fill='white'/%3E%3Ccircle cx='720' cy='280' r='2.5' fill='white'/%3E%3Ccircle cx='500' cy='350' r='1.5' fill='white'/%3E%3Ccircle cx='580' cy='320' r='1' fill='white'/%3E%3C/svg%3E"

/** FiguresPage gradient thumbnail (640×360, emerald→violet). */
export const FIGURES_GRADIENT_THUMB_URI =
	"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 640 360'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0%25' stop-color='%23059669'/%3E%3Cstop offset='100%25' stop-color='%237c3aed'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='640' height='360' fill='url(%23g)'/%3E%3Ccircle cx='180' cy='120' r='60' fill='white' fill-opacity='0.22'/%3E%3Ccircle cx='460' cy='240' r='100' fill='white' fill-opacity='0.15'/%3E%3Cpath d='M0 280 L160 200 L320 240 L480 180 L640 220 L640 360 L0 360 Z' fill='white' fill-opacity='0.18'/%3E%3C/svg%3E"

/** MediaPage gradient thumbnail (480×320, blue→violet). */
export const MEDIA_GRADIENT_THUMB_URI =
	"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 480 320'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0%25' stop-color='%232563eb'/%3E%3Cstop offset='100%25' stop-color='%237c3aed'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='480' height='320' fill='url(%23g)'/%3E%3Ccircle cx='120' cy='100' r='40' fill='white' fill-opacity='0.18'/%3E%3Ccircle cx='360' cy='200' r='80' fill='white' fill-opacity='0.12'/%3E%3Ccircle cx='240' cy='260' r='30' fill='white' fill-opacity='0.22'/%3E%3C/svg%3E"

/** MediaPage wide hero banner (1200×400, emerald→cyan, layered hills). */
export const MEDIA_WIDE_HERO_URI =
	"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 400'%3E%3Cdefs%3E%3ClinearGradient id='h' x1='0' y1='0' x2='1' y2='0'%3E%3Cstop offset='0%25' stop-color='%23059669'/%3E%3Cstop offset='100%25' stop-color='%230891b2'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='1200' height='400' fill='url(%23h)'/%3E%3Cpath d='M0 320 L300 200 L600 280 L900 160 L1200 240 L1200 400 L0 400 Z' fill='white' fill-opacity='0.15'/%3E%3Cpath d='M0 360 L400 280 L800 340 L1200 300 L1200 400 L0 400 Z' fill='white' fill-opacity='0.25'/%3E%3C/svg%3E"

/** MediaPage portrait image (320×480, pink→orange). */
export const MEDIA_PORTRAIT_URI =
	"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 320 480'%3E%3Cdefs%3E%3ClinearGradient id='p' x1='0' y1='0' x2='0' y2='1'%3E%3Cstop offset='0%25' stop-color='%23db2777'/%3E%3Cstop offset='100%25' stop-color='%23ea580c'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='320' height='480' fill='url(%23p)'/%3E%3Ccircle cx='160' cy='180' r='80' fill='white' fill-opacity='0.22'/%3E%3Cpath d='M40 480 L160 280 L280 480 Z' fill='white' fill-opacity='0.18'/%3E%3C/svg%3E"

/** Public sample video (Big Buck Bunny, Google test-content CDN). */
export const MEDIA_SAMPLE_VIDEO_URL =
	'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'

/** Public sample audio (SoundHelix freely-distributed track). */
export const MEDIA_SAMPLE_AUDIO_URL = 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3'

// ── Demo data ────────────────────────────────────────────────────────────
//
// Static seed data the demos iterate. Centralized verbatim so overlapping
// sets (fruit lists, slide decks, …) can be reconciled in one place.

/** InlineAtomsPage tag-chip labels. */
export const INLINE_ATOMS_TAGS = ['frontend', 'design', 'accessibility', 'docs', 'devops']

/** UseFormPage usernames the async-validation demo rejects as taken. */
export const FORM_RESERVED_USERNAMES = ['admin', 'root', 'ada']

/** UsePointerPage resize-demo max / min card box (CSS px). */
export const POINTER_CARD_MAX = { w: 480, h: 320 }
export const POINTER_CARD_MIN = { w: 180, h: 120 }

/** UseThemeButtonPage theme-setting options (value ↔ label ↔ glyph). */
export const THEME_BUTTON_OPTIONS = [
	{ value: 'light' as const, label: 'Light', icon: '☀️' },
	{ value: 'dark' as const, label: 'Dark', icon: '🌙' },
	{ value: 'system' as const, label: 'System', icon: '🖥️' },
]

/** UseTooltipPage placement picker — the four primary sides. */
export const TOOLTIP_PLACEMENT_SIDES: readonly Placement[] = ['top', 'end', 'bottom', 'start']

/** ThemePage variant-tier rows (the four semantic token tiers). */
export const THEME_TIERS = ['bg-subtle', 'text-emphasis', 'border-subtle', 'on-canvas'] as const

/** ScrollAndTransitionPage view-transition payloads. */
export const SCROLL_TRANSITION_SNAPSHOTS = [
	{
		title: 'Aurora Coast',
		body: 'A long stretch of pale sand under a teal-and-mauve sky. The water reflects the colour shift; tide pools warm into the early evening.',
		variant: 'information',
	},
	{
		title: 'Boreal Forest',
		body: 'Dense conifers, lichen-streaked rock, a thin layer of pine needles softening every footstep. The light filters through in vertical shafts.',
		variant: 'success',
	},
	{
		title: 'Volcanic Rift',
		body: 'Black basalt fractured along a long seam, steaming where the rainwater seeps in. Far below, the ribbon of magma glows like a dying ember.',
		variant: 'warning',
	},
] as const

/** UseCarouselPage slide deck. */
export const CAROUSEL_SLIDES = [
	{
		variant: 'primary',
		title: 'Aurora 1.2',
		body: 'Modern composition layer for the design system.',
	},
	{ variant: 'success', title: 'Build green', body: 'Continuous delivery on every push.' },
	{ variant: 'warning', title: 'Heads up', body: 'Deprecation notice for the legacy SDK.' },
	{ variant: 'danger', title: 'Action required', body: 'Migration deadline in 30 days.' },
	{
		variant: 'information',
		title: 'Read the docs',
		body: 'Full reference under the framework guides.',
	},
] as const

/** UseSelectPage single-select fruit options. */
export const SELECT_FRUITS = ['Apple', 'Banana', 'Cherry', 'Date', 'Elderberry', 'Fig', 'Grape']

/** UseSelectPage multi-select size options. */
export const SELECT_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL']

/** UseSelectPage combobox city options. */
export const SELECT_CITIES = [
	'Amsterdam',
	'Berlin',
	'Copenhagen',
	'Dublin',
	'Edinburgh',
	'Florence',
	'Geneva',
	'Helsinki',
	'Istanbul',
	'Jakarta',
	'Kyoto',
	'Lisbon',
	'Madrid',
	'Naples',
	'Oslo',
	'Paris',
	'Quito',
	'Reykjavík',
	'Stockholm',
	'Tokyo',
]

// ── TablesPage demo rows ─────────────────────────────────────────────────
//
// NOTE (consolidation): TABLES_BASIC_ROWS is the first four of
// TABLES_MEMBERS. Kept as separate exports for now; reconcile in the
// consolidation pass.

export const TABLES_MEMBERS: readonly TablesMember[] = [
	{
		id: 'AL-04',
		name: 'Ada Lovelace',
		role: 'Mathematician',
		team: 'Analytical',
		commits: 342,
		last: '2 hours ago',
	},
	{
		id: 'GH-12',
		name: 'Grace Hopper',
		role: 'Compiler theorist',
		team: 'Mark I',
		commits: 287,
		last: 'Yesterday',
	},
	{
		id: 'AT-21',
		name: 'Alan Turing',
		role: 'Cryptographer',
		team: 'Hut 8',
		commits: 256,
		last: '3 days ago',
	},
	{
		id: 'KR-08',
		name: 'Katherine Johnson',
		role: 'Mathematician',
		team: 'Orbital',
		commits: 198,
		last: 'Last week',
	},
	{
		id: 'MH-15',
		name: 'Margaret Hamilton',
		role: 'Software engineer',
		team: 'Apollo',
		commits: 412,
		last: '5 minutes ago',
	},
]

export const TABLES_BASIC_ROWS: readonly TablesMember[] = [
	{
		id: 'AL-04',
		name: 'Ada Lovelace',
		role: 'Mathematician',
		team: 'Analytical',
		commits: 342,
		last: '2 hours ago',
	},
	{
		id: 'GH-12',
		name: 'Grace Hopper',
		role: 'Compiler theorist',
		team: 'Mark I',
		commits: 287,
		last: 'Yesterday',
	},
	{
		id: 'AT-21',
		name: 'Alan Turing',
		role: 'Cryptographer',
		team: 'Hut 8',
		commits: 256,
		last: '3 days ago',
	},
	{
		id: 'KR-08',
		name: 'Katherine Johnson',
		role: 'Mathematician',
		team: 'Orbital',
		commits: 198,
		last: 'Last week',
	},
]

export const TABLES_VARIANT_ORDERS: readonly TablesOrder[] = [
	{
		id: '1042',
		customer: 'Acme Corp.',
		status: 'Shipped',
		total: '$2,340.00',
		variant: 'success',
		address: '742 Evergreen Terrace · Springfield · OR 97477',
		contact: 'logistics@acme.example · +1 555-0142',
		notes: 'Tracking number FX-8821-991. Signature on delivery requested.',
	},
	{
		id: '1043',
		customer: 'Globex Inc.',
		status: 'Processing',
		total: '$890.50',
		variant: 'information',
		address: '120 Globex Plaza · Springfield · IL 62704',
		contact: 'accounts@globex.example · +1 555-0188',
		notes: 'Awaiting line-2 confirmation. Estimated dispatch in 2 business days.',
	},
	{
		id: '1044',
		customer: 'Initech LLC',
		status: 'Returned',
		total: '$4,120.75',
		variant: 'warning',
		address: '4120 Veronica Way · Austin · TX 78701',
		contact: 'returns@initech.example · +1 555-0166',
		notes: 'RMA-2024-0488 received. Refund pending QA inspection of returned units.',
	},
	{
		id: '1045',
		customer: 'Soylent Corp.',
		status: 'Cancelled',
		total: '$650.00',
		variant: 'danger',
		address: '1 Soylent Boulevard · New Brooklyn · NY 11234',
		contact: 'support@soylent.example',
		notes: 'Cancelled by customer prior to fulfillment. No funds captured.',
	},
]

export const TABLES_THEME_TOKENS: readonly TablesThemeToken[] = [
	{
		id: 'canvas',
		token: '--color-canvas',
		light: '#fff',
		dark: 'slate-950',
		notes: 'The base surface color — every other tier mixes against it.',
	},
	{
		id: 'text',
		token: '--color-text',
		light: 'slate-900',
		dark: 'slate-100',
		notes: 'Body text. Inverts polarity per theme; everything else derives from it via color-mix.',
	},
	{
		id: 'border',
		token: '--color-border',
		light: 'slate-200',
		dark: 'slate-800',
		notes:
			'Default divider color. Consumed by --set-table-border-color, --set-input-border-color, and the bare list-group chrome.',
	},
]

export const TABLES_LOGS: readonly TablesLog[] = [
	{
		id: 'info-1',
		time: '14:02:11.842',
		level: 'info',
		source: 'auth',
		message: 'Session refreshed for user 42',
		context: 'jti=e7a1, ttl=900s, scope=read:profile read:billing',
	},
	{
		id: 'info-2',
		time: '14:02:11.901',
		level: 'info',
		source: 'db',
		message: 'Query took 4.3ms (cache hit)',
		context: 'SELECT id, name, plan FROM accounts WHERE org_id = $1 LIMIT 50',
	},
	{
		id: 'warn-1',
		time: '14:02:12.118',
		level: 'warn',
		source: 'billing',
		message: 'Retrying webhook delivery (attempt 3 of 5)',
		context:
			'POST https://hooks.example.com/billing — last response: 503 Service Unavailable. Next retry in 4s with jitter.',
	},
	{
		id: 'error-1',
		time: '14:02:12.404',
		level: 'error',
		source: 'payments',
		message: 'Provider returned 503 — falling back to queue',
		context:
			'POST /v1/charges → upstream 503. Idempotency key idem_8821 preserved; charge will retry from the durable queue.',
	},
]

export const TABLES_AUDITS: readonly TablesAudit[] = [
	{
		id: '2h',
		when: '2 hours ago',
		who: 'ada@example.com',
		what: 'Updated billing address',
		diff: 'Old: 50 Babbage Lane → New: 742 Evergreen Terrace · Springfield · OR 97477',
	},
	{
		id: 'yesterday',
		when: 'Yesterday',
		who: 'grace@example.com',
		what: 'Rotated API token',
		diff: 'Token sk_live_…ce91 revoked; sk_live_…b4f7 issued. Scope unchanged.',
	},
	{
		id: 'lastweek',
		when: 'Last week',
		who: 'katherine@example.com',
		what: 'Added team member',
		diff: 'margaret@example.com invited as Editor; invite pending acceptance.',
	},
]

export const TABLES_RELEASE_STEPS: readonly TablesReleaseStep[] = [
	{
		id: 'step-1',
		step: '1. Specification',
		status: 'Done',
		owner: 'Ada',
		notes:
			'Spec reviewed by the API council on 2026-04-30; signed off with two minor editorial revisions on §3.2 (status code table) and §7 (response examples).',
	},
	{
		id: 'step-2',
		step: '2. Implementation',
		status: 'In review',
		owner: 'Grace',
		notes:
			'PR #2918 open; 4 of 5 review threads resolved. Outstanding: telemetry sampling strategy in the new /v2/jobs handler.',
	},
	{
		id: 'step-3',
		step: '3. Visual QA',
		status: 'Pending',
		owner: 'Margaret',
		notes:
			'Visual QA blocked on the implementation PR landing. Test plan drafted in docs/test-plans/2026-Q2-release.md; ~20 minutes of screenshot regression once unblocked.',
	},
	{
		id: 'step-4',
		step: '4. Documentation',
		status: 'Not started',
		owner: 'Alan',
		notes:
			'Documentation depends on the spec-frozen body of §3.2 + §7 from step 1, plus the final handler signatures from step 2. Drafting will begin after Visual QA signs off.',
	},
]

// ── UseTablePage demo data ───────────────────────────────────────────────
//
// NOTE (consolidation): SELECT_FRUITS is the first seven of TABLE_FRUITS.
// Reconcile in the consolidation pass.

export const TABLE_ISSUES: readonly TableIssue[] = [
	{
		id: 'i1',
		title: 'Scroll-spy active threshold',
		status: 'open',
		priority: 'medium',
		assignee: 'Aria',
		updated: '2026-05-12',
		detail: 'Spy lands the wrong section at the body grid edge.',
	},
	{
		id: 'i2',
		title: 'Popover anchor flip',
		status: 'resolved',
		priority: 'low',
		assignee: 'Cass',
		updated: '2026-05-10',
		detail: 'Anchor-positioned popovers flipped on a 1-row threshold.',
	},
	{
		id: 'i3',
		title: 'Reduced-motion tab fade',
		status: 'in-progress',
		priority: 'high',
		assignee: 'Dax',
		updated: '2026-05-13',
		detail: 'Tab panel still fades when reduced-motion is on.',
	},
	{
		id: 'i4',
		title: 'Drawer focus return',
		status: 'open',
		priority: 'high',
		assignee: 'Aria',
		updated: '2026-05-11',
		detail: 'Closing a drawer leaves focus on <body>.',
	},
	{
		id: 'i5',
		title: 'Toast deck overflow clip',
		status: 'resolved',
		priority: 'medium',
		assignee: 'Bee',
		updated: '2026-05-09',
		detail: 'Deck cards clipped their hit-area pseudos.',
	},
	{
		id: 'i6',
		title: 'Combobox no-match dismiss',
		status: 'resolved',
		priority: 'medium',
		assignee: 'Cass',
		updated: '2026-05-14',
		detail: 'Auto-hide on filter no-match removed.',
	},
	{
		id: 'i7',
		title: 'Select keyboard rove wrap',
		status: 'open',
		priority: 'low',
		assignee: 'Dax',
		updated: '2026-05-08',
		detail: 'End / Home wrap inverted.',
	},
	{
		id: 'i8',
		title: 'Aside drawer scrim opacity',
		status: 'in-progress',
		priority: 'medium',
		assignee: 'Bee',
		updated: '2026-05-13',
		detail: 'Scrim reads too transparent in dark mode.',
	},
	{
		id: 'i9',
		title: 'Details accordion sync',
		status: 'resolved',
		priority: 'critical',
		assignee: 'Aria',
		updated: '2026-05-05',
		detail: "Accordion didn't close siblings on programmatic open.",
	},
	{
		id: 'i10',
		title: 'Form scroll-into-view',
		status: 'open',
		priority: 'low',
		assignee: 'Cass',
		updated: '2026-05-07',
		detail: "Validation error doesn't scroll to first invalid field.",
	},
	{
		id: 'i11',
		title: 'Nav rail filter focus',
		status: 'open',
		priority: 'medium',
		assignee: 'Dax',
		updated: '2026-05-12',
		detail: 'Press "/" focuses the filter even with inputs focused elsewhere.',
	},
	{
		id: 'i12',
		title: 'Carousel touch slide',
		status: 'in-progress',
		priority: 'high',
		assignee: 'Bee',
		updated: '2026-05-13',
		detail: 'Touch swipe locks the deck mid-slide.',
	},
	{
		id: 'i13',
		title: 'Tooltip placement reflow',
		status: 'resolved',
		priority: 'low',
		assignee: 'Aria',
		updated: '2026-05-06',
		detail: 'Tooltips repositioned on every scroll frame.',
	},
	{
		id: 'i14',
		title: 'Dialog modal stack',
		status: 'open',
		priority: 'critical',
		assignee: 'Cass',
		updated: '2026-05-14',
		detail: 'Stacked modals share one backdrop.',
	},
	{
		id: 'i15',
		title: 'Menu separator rule',
		status: 'resolved',
		priority: 'low',
		assignee: 'Dax',
		updated: '2026-05-04',
		detail: 'Separators rendered ABOVE the section eyebrow.',
	},
	{
		id: 'i16',
		title: 'Toast swipe rubber-band',
		status: 'resolved',
		priority: 'medium',
		assignee: 'Bee',
		updated: '2026-05-14',
		detail: 'Swipe cap at threshold; auto-dismiss at bound.',
	},
	{
		id: 'i17',
		title: 'Sidebar gutter flex',
		status: 'resolved',
		priority: 'medium',
		assignee: 'Aria',
		updated: '2026-05-14',
		detail: 'Pinned region ballooned via flex-grow inheritance.',
	},
	{
		id: 'i18',
		title: 'Drag-drop file overlay',
		status: 'open',
		priority: 'high',
		assignee: 'Cass',
		updated: '2026-05-13',
		detail: 'Drop overlay flickers on dragenter / dragleave race.',
	},
	{
		id: 'i19',
		title: 'Table expansion strip',
		status: 'resolved',
		priority: 'high',
		assignee: 'Dax',
		updated: '2026-05-14',
		detail: 'JS height tween replaced by CSS interpolate-size.',
	},
	{
		id: 'i20',
		title: 'Pointer cursor lock',
		status: 'in-progress',
		priority: 'low',
		assignee: 'Bee',
		updated: '2026-05-12',
		detail: 'Body cursor stays grabbing after pointercancel.',
	},
	{
		id: 'i21',
		title: 'Theme cycle reduced-motion',
		status: 'open',
		priority: 'low',
		assignee: 'Aria',
		updated: '2026-05-08',
		detail: 'View-transition runs even with prefers-reduced-motion.',
	},
	{
		id: 'i22',
		title: 'Tabs lazy panel mount',
		status: 'open',
		priority: 'medium',
		assignee: 'Cass',
		updated: '2026-05-11',
		detail: 'Inactive tab panel keeps its DOM tree alive.',
	},
	{
		id: 'i23',
		title: 'Alert auto-dismiss timer',
		status: 'in-progress',
		priority: 'medium',
		assignee: 'Dax',
		updated: '2026-05-13',
		detail: 'Timer keeps running across remounts.',
	},
	{
		id: 'i24',
		title: 'Output status announcement',
		status: 'resolved',
		priority: 'low',
		assignee: 'Bee',
		updated: '2026-05-09',
		detail: 'Live region announced on every value change.',
	},
]

export const TABLE_FRUITS = [
	'Apple',
	'Banana',
	'Cherry',
	'Date',
	'Elderberry',
	'Fig',
	'Grape',
	'Honeydew',
	'Imbe',
	'Jackfruit',
	'Kiwi',
	'Lemon',
]

export const TABLE_DICTIONARY: readonly (readonly [string, string, string])[] = [
	['1', 'caret', 'A horizontal-wedge symbol used to indicate insertion or selection.'],
	['2', 'kerning', 'Per-pair letter spacing adjustment to improve typographical rhythm.'],
	['3', 'leading', 'Vertical space between baselines of consecutive lines of text.'],
	['4', 'tracking', 'Uniform letter spacing applied across a run of characters.'],
	['5', 'baseline', 'Imaginary line on which most letters sit.'],
	['6', 'x-height', 'Height of the lowercase letter "x" within a typeface.'],
	['7', 'ascender', 'Stroke of a lowercase letter extending above the x-height.'],
	['8', 'descender', 'Stroke of a lowercase letter extending below the baseline.'],
	['9', 'cap height', 'Height of an uppercase letter.'],
	['10', 'em', 'Relative unit equal to the type-size of the current font.'],
	['11', 'em-dash', 'A long dash used to set off parenthetical text.'],
	['12', 'em-space', 'A space the width of an em.'],
]

// ── TokensPage demo data ─────────────────────────────────────────────────

export const TOKENS_ICONS: readonly TokenIcon[] = [
	{ token: '--set-icon-chevron-down', label: 'Chevron down' },
	{ token: '--set-icon-chevron-up', label: 'Chevron up' },
	{ token: '--set-icon-chevron-left', label: 'Chevron left' },
	{ token: '--set-icon-chevron-right', label: 'Chevron right' },
	{ token: '--set-icon-caret-down', label: 'Caret down' },
	{ token: '--set-icon-caret-up', label: 'Caret up' },
	{ token: '--set-icon-check', label: 'Check' },
	{ token: '--set-icon-dash', label: 'Dash' },
	{ token: '--set-icon-radio', label: 'Radio dot' },
	{ token: '--set-icon-close', label: 'Close (×)' },
	{ token: '--set-icon-menu', label: 'Menu (hamburger)' },
	{ token: '--set-icon-more', label: 'More (⋮)' },
	{ token: '--set-icon-search', label: 'Search' },
	{ token: '--set-icon-filter', label: 'Filter' },
	{ token: '--set-icon-sort', label: 'Sort' },
	{ token: '--set-icon-external', label: 'External link' },
	{ token: '--set-icon-sun', label: 'Sun (light theme)' },
	{ token: '--set-icon-moon', label: 'Moon (dark theme)' },
	{ token: '--set-icon-system', label: 'System (auto theme)' },
	{ token: '--set-icon-information', label: 'Information' },
	{ token: '--set-icon-success', label: 'Success' },
	{ token: '--set-icon-warning', label: 'Warning' },
	{ token: '--set-icon-danger', label: 'Danger' },
	{ token: '--set-icon-plus', label: 'Plus' },
	{ token: '--set-icon-minus', label: 'Minus' },
]

// ── ModifiersPage matrix data ────────────────────────────────────────────
//
// `''` is the "no modifier / default" matrix cell. Order is the demo's
// display order (kept verbatim).

export const MODIFIERS_SIZES: readonly ModifierSizeOption[] = ['small', '', 'large']
export const MODIFIERS_STYLE_NAMES: readonly ModifierStyleOption[] = ['', 'subtle', 'filled']
export const MODIFIERS_STATES: readonly ModifierStateOption[] = ['', 'disabled', 'active', 'loading']

/** Sizes table — concrete values from `modifiers/_sizes.scss`. */
export const MODIFIERS_SIZE_ROWS: readonly ModifierSizeRow[] = [
	{
		label: '.small',
		padInline: '0.5em',
		padBlock: '0.25em',
		fontSize: '0.875rem',
		radius: 'sm (0.25rem)',
	},
	{
		label: 'default',
		padInline: '0.75rem',
		padBlock: '0.375rem',
		fontSize: '0.875rem',
		radius: 'md (0.375rem)',
	},
	{
		label: '.large',
		padInline: '1rem',
		padBlock: '0.5rem',
		fontSize: '1rem',
		radius: 'lg (0.5rem)',
	},
]

// ── PlacementsPage placement picker ──────────────────────────────────────
//
// Side-grouped display order. ModifiersPage keeps its own grid-ordered
// 8-value list page-local by design (different presentation).

export const PLACEMENTS_MODIFIER: readonly ModifierPlacement[] = [
	'top',
	'top-start',
	'top-end',
	'bottom',
	'bottom-start',
	'bottom-end',
	'start',
	'end',
]
