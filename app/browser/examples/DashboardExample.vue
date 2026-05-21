<script lang="ts" setup>
/**
 * DashboardExample — semantic-first port of mailbox's DashboardExample.
 *
 * Layout intent:
 *   - Persistent left <nav> rail above 768px; offcanvas drawer below.
 *   - Topbar <header> with search + action menu.
 *   - <main> with stats row, then revenue chart + quick-actions, then
 *     a recent-activity timeline.
 *
 * Body-shell pattern: the template renders <nav>, <header>, <main> as
 * Vue-fragment siblings (no wrapping element). ExamplesShell renders a
 * fragment too, so these elements end up as effective grandchildren of
 * <body> via the #app `display: contents` hop. That lets the
 * framework's body-shell selectors (`body:has(main) > * > nav`,
 * `> header`, `> main`) paint the chrome — sidebar inline-size,
 * border, drawer popover mode, nav-rail menu chrome, header band,
 * main padding. The scoped CSS below covers only the truly app-
 * specific bits (stat-card typography, SVG chart fill, timeline rail).
 *
 * Translation rules (per the spec):
 *   - `.btn-primary` / `.btn-secondary` → bare <button class="primary|subtle">.
 *   - `.btn-group[role=toolbar]` → <menu role="toolbar">.
 *   - `.offcanvas-md offcanvas-start` → <nav :popover>.
 *   - `.bi bi-*` → <i class="icon" style="--icon: var(--set-icon-X)">.
 *   - `.card` → <article>. `.card-header/body/footer` → <header>/<div>/<footer>
 *     inside <article>.
 *   - `.timeline-item` → <li> in an <ol>; status uses <small class="tag X">.
 */
import { computed, onMounted, onUnmounted, ref } from 'vue'

interface Stat {
	readonly label: string
	readonly value: string
	readonly trend: 'up' | 'down' | 'flat'
	readonly delta: string
}

interface ActivityRow {
	readonly when: string
	readonly who: string
	readonly action: string
	readonly target: string
	readonly status: 'paid' | 'pending' | 'failed'
}

const stats: readonly Stat[] = [
	{ label: 'Monthly revenue', value: '$48,290', trend: 'up', delta: '+12.4%' },
	{ label: 'Active subscribers', value: '3,142', trend: 'up', delta: '+184' },
	{ label: 'Avg. response time', value: '1.4h', trend: 'down', delta: '-0.3h' },
	{ label: 'Open tickets', value: '27', trend: 'flat', delta: '0' },
]

const activity: readonly ActivityRow[] = [
	{
		when: '2m ago',
		who: 'Ada Lovelace',
		action: 'paid invoice',
		target: 'INV-1042',
		status: 'paid',
	},
	{
		when: '14m ago',
		who: 'Grace Hopper',
		action: 'submitted form',
		target: 'Onboarding · Step 3',
		status: 'pending',
	},
	{
		when: '38m ago',
		who: 'Linus Torvalds',
		action: 'updated billing',
		target: 'Visa •• 4012',
		status: 'paid',
	},
	{
		when: '1h ago',
		who: 'Margaret Hamilton',
		action: 'failed checkout',
		target: 'Cart 8721',
		status: 'failed',
	},
	{
		when: '3h ago',
		who: 'Hedy Lamarr',
		action: 'cancelled trial',
		target: 'Pro plan',
		status: 'pending',
	},
]

const statusVariant: Record<ActivityRow['status'], string> = {
	paid: 'success',
	pending: 'warning',
	failed: 'danger',
}

const trendIconToken: Record<Stat['trend'], string> = {
	up: 'caret-up' /* TODO icon swap — caret-up stands in for missing 'arrow-up-right' */,
	down: 'caret-down' /* TODO icon swap — caret-down stands in for missing 'arrow-down-right' */,
	flat: 'dash' /* TODO icon swap — dash stands in for missing 'arrow-right' */,
}

// Delta foreground keyed on trend — framework theme tokens, bound inline so
// the stat card needs no per-trend scoped rule.
const trendDeltaColor: Record<Stat['trend'], string> = {
	up: 'var(--color-success-text-emphasis)',
	down: 'var(--color-danger-text-emphasis)',
	flat: 'var(--color-text-subtle)',
}

// Topbar secondary actions — ONE source of truth. The desktop header
// renders these as an inline icon toolbar; the mobile drawer renders the
// same list as labelled rows. Single array so the two viewport surfaces
// can never drift apart (no hand-cloned markup per viewport).
interface TopbarAction {
	readonly label: string
	readonly icon: string
}
const actions: readonly TopbarAction[] = [
	{ label: 'Refresh', icon: 'sort' } /* TODO icon swap — sort stands in for 'refresh' */,
	{ label: 'Filter', icon: 'filter' },
	{ label: 'Export', icon: 'chevron-down' } /* TODO icon swap — for 'download' */,
	{ label: 'Notifications', icon: 'information' } /* TODO icon swap — for 'bell' */,
	{ label: 'Help', icon: 'information' } /* TODO icon swap — for 'help' */,
	{ label: 'Settings', icon: 'system' },
]

const range = ref<'7d' | '30d' | '90d'>('30d')

// Mobile drawer breakpoint — same 960px the docs shell uses (see
// App.vue + constants.ts MOBILE_QUERY) so the dashboard's drawer
// behaviour matches the rest of the framework chrome.
const MOBILE_QUERY = '(max-width: 960px)'
const isMobile = ref(false)
const mobileMq = typeof window !== 'undefined' ? window.matchMedia(MOBILE_QUERY) : null
const syncMobile = (): void => {
	isMobile.value = mobileMq?.matches ?? false
}

// Sidebar drawer — no composable needed. The `<nav popover>` drawer
// chrome is pure CSS (framework's `_aside.scss` / `_nav.scss`
// `[popover]` rules); toggling is via native `popovertarget` buttons.
// Same pattern App.vue uses for its primary-rail.

// Deterministic SVG bar heights so screenshots are reproducible.
const chartBars = computed(() =>
	Array.from({ length: 30 }, (_, i) => ({
		x: i,
		h: 35 + Math.abs(Math.sin(i * 0.7)) * 65,
		highlight: i === 23,
	})),
)

onMounted(() => {
	syncMobile()
	mobileMq?.addEventListener('change', syncMobile)
})
onUnmounted(() => {
	mobileMq?.removeEventListener('change', syncMobile)
})
</script>

<template>
	<!-- Sidebar — <nav> at body-shell position. Framework's
	     `body:has(main) > * > nav` chrome paints the inline-size,
	     border-inline-end, popover drawer mode, and (inside) the
	     nav-rail menu chrome (column layout, full-width links, hover
	     tint, aria-current=page state). No scoped CSS for any of that. -->
	<nav
		id="dashboard-sidebar"
		class="start"
		:popover="isMobile ? 'auto' : undefined"
		aria-label="Primary"
	>
		<!-- Brand band — <header> inside body-shell <nav> picks up the
		     framework's drawer/rail header chrome (chunky band, divider,
		     pinned top). -->
		<header>
			<!-- TODO icon swap — external stands in for missing 'box' (app/brand icon) -->
			<i class="icon" aria-hidden="true" style="--icon: var(--set-icon-external)"></i>
			<strong class="flex-1">Acme Console</strong>
			<button
				v-if="isMobile"
				type="button"
				class="subtle compact"
				aria-label="Close menu"
				popovertarget="dashboard-sidebar"
				popovertargetaction="hide"
			>
				<i class="icon" aria-hidden="true" style="--icon: var(--set-icon-close)"></i>
			</button>
		</header>

		<menu>
			<li>
				<a href="#" aria-current="page">
					<!-- TODO icon swap — information stands in for missing 'speedometer' -->
					<i class="icon" aria-hidden="true" style="--icon: var(--set-icon-information)"></i>
					Overview
				</a>
			</li>
			<li>
				<a href="#">
					<!-- TODO icon swap — sort stands in for missing 'bar-chart' -->
					<i class="icon" aria-hidden="true" style="--icon: var(--set-icon-sort)"></i>
					Analytics
				</a>
			</li>
			<li>
				<a href="#">
					<!-- TODO icon swap — more stands in for missing 'people' -->
					<i class="icon" aria-hidden="true" style="--icon: var(--set-icon-more)"></i>
					Customers
				</a>
			</li>
			<li>
				<a href="#">
					<!-- TODO icon swap — minus stands in for missing 'receipt' -->
					<i class="icon" aria-hidden="true" style="--icon: var(--set-icon-minus)"></i>
					Invoices
				</a>
			</li>
			<li>
				<a href="#">
					<!-- TODO icon swap — system stands in for missing 'gear' -->
					<i class="icon" aria-hidden="true" style="--icon: var(--set-icon-system)"></i>
					Settings
				</a>
			</li>
		</menu>

		<!-- The framework's `_menu.scss` ships the h6 + <menu> sibling
		     rhythm for grouped nav rails; the h6 gets a small-caps eyebrow
		     style automatically inside the body-shell nav. -->
		<h6>Workspaces</h6>
		<menu>
			<li>
				<a href="#">
					<span class="avatar small" aria-hidden="true">A</span>
					Acme Inc
				</a>
			</li>
			<li>
				<a href="#">
					<span class="avatar small" aria-hidden="true">B</span>
					Buena Vista
				</a>
			</li>
		</menu>

		<!-- Account band — <footer> inside body-shell <nav> picks up the
		     framework's rail footer chrome (flex band, divider, top border)
		     and pins to the bottom via the framework's `margin-block-start:
		     auto` rule (`_footer.scss`) in BOTH the in-flow desktop rail and
		     the mobile popover drawer — same element, no per-viewport CSS.
		     The menus + h6 above flow at their natural height (rail children
		     don't grow), so the footer's auto-margin takes the remaining
		     space and pushes the account row to the bottom (conventional
		     sidebar shape — Slack / Discord / Linear). -->
		<footer>
			<span class="avatar" aria-hidden="true">MS</span>
			<span class="flex flex-col leading-tight">
				<strong>Mike Saint</strong>
				<small>mike@acme.dev</small>
			</span>
		</footer>
	</nav>

	<!-- Topbar — <header> at body-shell position. Framework's
	     `body:has(main) > header` paints the band chrome (height,
	     border-block-end, background).
	     Above md the action menu shows inline. Below md the inline
	     menu is hidden and a single "Actions" trigger button opens
	     the right-side <aside popover class="end"> drawer below
	     (same offcanvas-end pattern mailbox uses). The drawer mirrors
	     the framework's docs-shell TOC rail on the right edge — same
	     chrome contract as the primary <nav> on the left. -->
	<header>
		<button
			v-if="isMobile"
			type="button"
			class="subtle compact"
			aria-label="Open menu"
			popovertarget="dashboard-sidebar"
		>
			<i class="icon" aria-hidden="true" style="--icon: var(--set-icon-menu)"></i>
		</button>
		<form class="hidden md:flex flex-1 min-w-0 max-w-sm me-auto" role="search" @submit.prevent>
			<label>
				<span class="sr-only">Search</span>
				<input
					class="w-full"
					type="search"
					placeholder="Search customers, invoices, settings…"
					autocomplete="off"
				/>
			</label>
		</form>
		<button type="button" class="primary ms-auto md:ms-0">
			<i class="icon" aria-hidden="true" style="--icon: var(--set-icon-plus)"></i>
			<span class="hidden md:inline">New invoice</span>
		</button>
		<menu role="toolbar" aria-label="Dashboard actions" class="hidden md:flex gap-1">
			<li v-for="action in actions" :key="action.label" role="none">
				<button type="button" class="subtle compact" :aria-label="action.label">
					<i class="icon" aria-hidden="true" :style="`--icon: var(--set-icon-${action.icon})`"></i>
				</button>
			</li>
		</menu>
		<button
			v-if="isMobile"
			type="button"
			class="subtle compact"
			aria-label="Open actions"
			popovertarget="dashboard-actions"
		>
			<i class="icon" aria-hidden="true" style="--icon: var(--set-icon-more)"></i>
		</button>
	</header>

	<!-- Right-side action drawer — mobile only (`v-if="isMobile"`).
	     `<aside popover class="end">` slides in from the inline-end
	     edge with the framework's drawer chrome (top-layer, native
	     ::backdrop scrim, Esc + click-out dismiss). The same shape the
	     docs shell uses for its right-rail TOC, repurposed as the
	     dashboard's actions panel. -->
	<aside v-if="isMobile" id="dashboard-actions" popover class="end" aria-label="Dashboard actions">
		<header>
			<strong>Actions</strong>
			<button
				type="button"
				class="subtle compact"
				aria-label="Close actions"
				popovertarget="dashboard-actions"
				popovertargetaction="hide"
			>
				<i class="icon" aria-hidden="true" style="--icon: var(--set-icon-close)"></i>
			</button>
		</header>
		<menu>
			<li v-for="action in actions" :key="action.label">
				<button type="button">
					<i class="icon" aria-hidden="true" :style="`--icon: var(--set-icon-${action.icon})`"></i>
					{{ action.label }}
				</button>
			</li>
		</menu>
	</aside>

	<!-- Page content — <main> at body-shell position. Framework's
	     `body:has(main) > main` paints scroll + overflow + the gap +
	     padding tokens.
	     The token overrides tighten the dashboard's content gutter
	     so it reads as an app screen (compact, near edge-to-edge on
	     mobile, breathing room on desktop) rather than the docs
	     reading gutter (`clamp(1rem, 5vw, 2.5rem)`). The framework's
	     page-shell token group exposes these for exactly this kind of
	     per-shell theming — see `taxonomy.ts § TOKEN_GROUPS.page-shell`.
	     The floating ExamplesShell toolbar can't overlap the last row:
	     `body:has(.examples-toolbar)` reserves a bottom safe-area (see
	     `styles/examples.css`), so no per-page bottom padding is needed. -->
	<main
		style="--set-main-padding-inline: 1rem; --set-main-padding-block: 1rem; --set-main-gap: 1rem"
	>
		<header class="flex flex-wrap justify-between items-end gap-4">
			<hgroup>
				<p class="m-0 text-xs uppercase tracking-wide" style="color: var(--color-text-subtle)">
					Overview
				</p>
				<h1 class="my-1 text-2xl">Welcome back, Mike</h1>
				<p>Here's what's happened across your workspace this {{ range }}.</p>
			</hgroup>
			<!-- Segmented control — `<div role="group">` gives the framework's
			     overlapping-border button-group chrome; `.secondary subtle`
			     paints quiet tinted segments (and the border-width the overlap
			     needs), and `aria-pressed` fills the chosen segment via the
			     framework's toggle-selected state. No scoped CSS. -->
			<div role="group" aria-label="Date range">
				<button
					v-for="r in ['7d', '30d', '90d'] as const"
					:key="r"
					type="button"
					class="secondary subtle small"
					:aria-pressed="range === r"
					@click="range = r"
				>
					{{ r }}
				</button>
			</div>
		</header>

		<!-- Stat cards — auto-fit grid so cards wrap on narrow viewports.
		     <article class="small"> gives card chrome from the framework
		     (border, radius, shadow, flex-col, tight padding). -->
		<section
			aria-label="Key metrics"
			class="grid gap-4 grid-cols-[repeat(auto-fit,minmax(13.75rem,1fr))]"
		>
			<article v-for="stat in stats" :key="stat.label" class="small">
				<dl class="m-0 flex flex-col gap-1">
					<dt class="text-sm" style="color: var(--color-text-subtle)">{{ stat.label }}</dt>
					<dd class="m-0 text-[1.75rem] font-bold">{{ stat.value }}</dd>
					<dd
						class="m-0 inline-flex items-center gap-1.5 text-[0.8125rem]"
						:style="{ color: trendDeltaColor[stat.trend] }"
					>
						<i
							class="icon"
							aria-hidden="true"
							:style="`--icon: var(--set-icon-${trendIconToken[stat.trend]})`"
						></i>
						{{ stat.delta }}
						<small class="ms-1" style="color: var(--color-text-subtle)">vs last period</small>
					</dd>
				</dl>
			</article>
		</section>

		<!-- Chart + Quick-actions row — 2:1 grid above 1024px, stacked
		     below. <article> handles the card chrome. -->
		<section
			class="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]"
			aria-label="Revenue and quick actions"
		>
			<article>
				<header>
					<hgroup>
						<h2>Revenue trajectory</h2>
						<p>Daily gross, cohort-adjusted</p>
					</hgroup>
					<ul class="inline-flex gap-4 m-0 p-0 list-none text-sm ms-auto">
						<li class="inline-flex items-center gap-1">
							<span
								class="dot"
								style="--set-dot-background-color: var(--color-primary)"
								aria-hidden="true"
							></span>
							Revenue
						</li>
						<li class="inline-flex items-center gap-1">
							<span
								class="dot"
								style="--set-dot-background-color: var(--color-information)"
								aria-hidden="true"
							></span>
							Forecast
						</li>
					</ul>
				</header>
				<figure class="m-0">
					<svg
						viewBox="0 0 300 100"
						preserveAspectRatio="none"
						class="dashboard-chart w-full block"
						role="img"
						aria-label="Revenue chart, illustrative"
					>
						<rect
							v-for="bar in chartBars"
							:key="bar.x"
							:x="bar.x * 10 + 1"
							:y="100 - bar.h"
							width="8"
							:height="bar.h"
							:data-highlight="bar.highlight || undefined"
						/>
					</svg>
					<figcaption>
						Hover any bar for the day's breakdown — figures auto-adjust for refunds.
					</figcaption>
				</figure>
			</article>

			<article>
				<header>
					<h2>Quick actions</h2>
				</header>
				<menu class="flex-col flex-nowrap items-stretch">
					<li>
						<!-- TODO icon swap — plus stands in for missing 'person-plus' -->
						<button type="button" class="subtle w-full justify-start text-start">
							<i class="icon" aria-hidden="true" style="--icon: var(--set-icon-plus)"></i>
							Invite a teammate
						</button>
					</li>
					<li>
						<!-- TODO icon swap — minus stands in for missing 'receipt' -->
						<button type="button" class="subtle w-full justify-start text-start">
							<i class="icon" aria-hidden="true" style="--icon: var(--set-icon-minus)"></i>
							Draft an invoice
						</button>
					</li>
					<li>
						<!-- TODO icon swap — external stands in for missing 'cloud-upload' -->
						<button type="button" class="subtle w-full justify-start text-start">
							<i class="icon" aria-hidden="true" style="--icon: var(--set-icon-external)"></i>
							Import customers
						</button>
					</li>
					<li>
						<!-- TODO icon swap — success stands in for missing 'shield-check' -->
						<button type="button" class="subtle w-full justify-start text-start">
							<i class="icon" aria-hidden="true" style="--icon: var(--set-icon-success)"></i>
							Run a security audit
						</button>
					</li>
					<li>
						<!-- TODO icon swap — information stands in for missing 'life-preserver' -->
						<button type="button" class="subtle w-full justify-start text-start">
							<i class="icon" aria-hidden="true" style="--icon: var(--set-icon-information)"></i>
							Contact support
						</button>
					</li>
				</menu>
			</article>
		</section>

		<!-- Recent activity — <article> card with the framework's auto-
		     banded <header> chrome (subtle tinted band, separator, inner
		     radius matched to outer). The timeline <ol> sits in the card
		     body with article padding. Matches the chart + quick-actions
		     cards above so the page reads as a uniform set of cards. -->
		<article aria-label="Recent activity">
			<header>
				<hgroup>
					<h2>Recent activity</h2>
					<p>Last 24 hours across all workspaces</p>
				</hgroup>
				<a href="#" class="ms-auto">View all</a>
			</header>
			<ol class="dashboard-timeline">
				<li
					v-for="row in activity"
					:key="row.target"
					class="relative py-2"
					:data-status="row.status"
				>
					<span class="dashboard-timeline-marker dot" aria-hidden="true"></span>
					<div class="flex flex-wrap items-baseline gap-2 ml-4">
						<p class="m-0 flex flex-wrap items-baseline gap-2">
							<strong>{{ row.who }}</strong>
							<span>{{ row.action }}</span>
							<code class="text-sm">{{ row.target }}</code>
							<small class="tag ms-auto" :class="statusVariant[row.status]">{{ row.status }}</small>
						</p>
						<time
							class="block text-xs"
							style="color: var(--color-text-subtle); margin-block-start: 0.125rem"
							>{{ row.when }}</time
						>
					</div>
				</li>
			</ol>
		</article>
	</main>
</template>

<style scoped>
/* ── App-specific layout glue ──────────────────────────────────────────
 *
 * The body-shell <nav>, <header>, <main> elements get their chrome from
 * the framework's body-shell selectors (border, padding, sidebar
 * width, drawer popover mode, nav-rail menu styling, header band,
 * main padding). Only the truly app-specific bits remain here.
 * ──────────────────────────────────────────────────────────────────── */

/* SVG chart — fixed block-size + framework color tokens for the bars.
 * SVG presentation attributes can't be set via Tailwind utilities. */
.dashboard-chart {
	block-size: 14rem;
}

.dashboard-chart rect {
	fill: var(--color-primary, oklch(60% 0.15 250));
	opacity: 0.45;
}

.dashboard-chart rect[data-highlight] {
	fill: var(--color-information, oklch(70% 0.15 220));
	opacity: 0.85;
}

/* Quick-actions menu — framework's `article menu` rule sets
 * justify-end (horizontal trailing-edge layout). The actions panel
 * wants a vertical column instead. */
.dashboard-actions-menu {
	flex-direction: column;
	flex-wrap: nowrap;
	align-items: stretch;
}

/* Timeline rail + markers — no framework timeline primitive; this is
 * genuinely app-specific geometry. */
.dashboard-timeline {
	margin: 0;
	padding: 0;
	list-style: none;
	border-inline-start: 2px solid var(--color-border);
	padding-inline-start: 1.5rem;
}

.dashboard-timeline-marker {
	position: absolute;
	inset-inline-start: calc(-1.5rem - 0.4rem - 1px);
	inset-block-start: 0.875rem;
	--set-dot-size: 0.8rem;
	background: var(--color-surface);
	box-shadow: 0 0 0 2px currentColor;
	color: var(--color-text-subtle);
}

.dashboard-timeline > li[data-status='paid'] .dashboard-timeline-marker {
	color: var(--color-success);
}
.dashboard-timeline > li[data-status='pending'] .dashboard-timeline-marker {
	color: var(--color-warning);
}
.dashboard-timeline > li[data-status='failed'] .dashboard-timeline-marker {
	color: var(--color-danger);
}
</style>
