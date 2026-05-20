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
					<span class="mark" aria-hidden="true">A</span>
					Acme Inc
				</a>
			</li>
			<li>
				<a href="#">
					<span class="mark" aria-hidden="true">B</span>
					Buena Vista
				</a>
			</li>
		</menu>

		<!-- Account band — <footer> inside body-shell <nav> picks up the
		     framework's drawer/rail footer chrome (divider, pinned bottom).
		     A scoped justify-content override below shifts content to the
		     inline-start edge (the framework's drawer footer defaults to
		     flex-end for action rows; this is an info row). -->
		<footer class="dashboard-account">
			<span class="mark account-mark" aria-hidden="true">MS</span>
			<span class="flex flex-col leading-tight">
				<strong>Mike Saint</strong>
				<small>mike@acme.dev</small>
			</span>
		</footer>
	</nav>

	<!-- Topbar — <header> at body-shell position. Framework's
	     `body:has(main) > header` paints the band chrome (height,
	     border-block-end, background). -->
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
		<form class="dashboard-search hidden md:flex" role="search" @submit.prevent>
			<label>
				<span class="sr-only">Search</span>
				<input
					type="search"
					placeholder="Search customers, invoices, settings…"
					autocomplete="off"
				/>
			</label>
		</form>
		<menu role="toolbar" aria-label="Dashboard actions" class="dashboard-actions">
			<li role="none">
				<button type="button" class="primary">
					<i class="icon" aria-hidden="true" style="--icon: var(--set-icon-plus)"></i>
					<span class="hidden md:inline">New invoice</span>
				</button>
			</li>
			<li role="none" class="hidden md:contents">
				<!-- TODO icon swap — sort stands in for missing 'refresh' -->
				<button type="button" class="subtle compact" aria-label="Refresh">
					<i class="icon" aria-hidden="true" style="--icon: var(--set-icon-sort)"></i>
				</button>
			</li>
			<li role="none" class="hidden md:contents">
				<button type="button" class="subtle compact" aria-label="Filter">
					<i class="icon" aria-hidden="true" style="--icon: var(--set-icon-filter)"></i>
				</button>
			</li>
			<li role="none" class="hidden md:contents">
				<!-- TODO icon swap — chevron-down stands in for missing 'download' -->
				<button type="button" class="subtle compact" aria-label="Export">
					<i class="icon" aria-hidden="true" style="--icon: var(--set-icon-chevron-down)"></i>
				</button>
			</li>
			<li role="none">
				<!-- TODO icon swap — information stands in for missing 'bell' -->
				<button type="button" class="subtle compact" aria-label="Notifications">
					<i class="icon" aria-hidden="true" style="--icon: var(--set-icon-information)"></i>
				</button>
			</li>
		</menu>
	</header>

	<!-- Page content — <main> at body-shell position. Framework's
	     `body:has(main) > main` paints scroll + overflow + the gap +
	     padding tokens.
	     The token overrides tighten the dashboard's content gutter
	     so it reads as an app screen (compact, near edge-to-edge on
	     mobile, breathing room on desktop) rather than the docs
	     reading gutter (`clamp(1rem, 5vw, 2.5rem)`). The framework's
	     page-shell token group exposes these for exactly this kind of
	     per-shell theming — see `taxonomy.ts § TOKEN_GROUPS.page-shell`.
	     `pb-28` keeps the floating ExamplesShell toolbar from sitting
	     on top of the last row on mobile. -->
	<main
		class="pb-28 sm:pb-0"
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
			<menu role="toolbar" aria-label="Date range" class="dashboard-range">
				<li v-for="r in ['7d', '30d', '90d'] as const" :key="r" role="none">
					<button
						type="button"
						class="subtle"
						:class="{ active: range === r }"
						:aria-pressed="range === r"
						@click="range = r"
					>
						{{ r }}
					</button>
				</li>
			</menu>
		</header>

		<!-- Stat cards — auto-fit grid so cards wrap on narrow viewports.
		     <article class="small"> gives card chrome from the framework
		     (border, radius, shadow, flex-col, tight padding). -->
		<section aria-label="Key metrics" class="dashboard-stats">
			<article v-for="stat in stats" :key="stat.label" class="small">
				<dl class="m-0 flex flex-col gap-1">
					<dt class="text-sm" style="color: var(--color-text-subtle)">{{ stat.label }}</dt>
					<dd class="dashboard-stat-value">{{ stat.value }}</dd>
					<dd class="dashboard-stat-delta" :data-trend="stat.trend">
						<i
							class="icon"
							aria-hidden="true"
							:style="`--icon: var(--set-icon-${trendIconToken[stat.trend]})`"
						></i>
						{{ stat.delta }}
						<small style="color: var(--color-text-subtle); margin-inline-start: 0.25rem"
							>vs last period</small
						>
					</dd>
				</dl>
			</article>
		</section>

		<!-- Chart + Quick-actions row — 2:1 grid above 1024px, stacked
		     below. <article> handles the card chrome. -->
		<section class="dashboard-chart-row" aria-label="Revenue and quick actions">
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
				<menu class="dashboard-actions-menu">
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

		<section aria-label="Recent activity">
			<header class="flex justify-between items-end gap-4 mb-3">
				<hgroup>
					<h2>Recent activity</h2>
					<p>Last 24 hours across all workspaces</p>
				</hgroup>
				<a href="#">View all</a>
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
		</section>
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

/* Account row in the nav footer — framework drawer footer defaults to
 * `justify-content: flex-end` (for trailing-action rows like Cancel |
 * Save). The dashboard's footer is an info row; shift content to the
 * inline-start edge alongside the mark. */
.dashboard-account {
	justify-content: flex-start;
}

/* Circular initials badge — no framework "filled circle with text"
 * primitive. Shared between the workspace links and the account row. */
.mark {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	inline-size: 1.5rem;
	block-size: 1.5rem;
	border-radius: 999px;
	background: var(--color-surface-raised, var(--color-surface));
	font-size: 0.75rem;
	font-weight: 600;
	flex-shrink: 0;
}

.account-mark {
	inline-size: 2rem;
	block-size: 2rem;
}

/* Search form — flex-grow to fill available row space, max-width cap
 * so the input stops growing on wide topbars. The framework's
 * `<form role="search">` + `<input type="search">` chrome paints the
 * rest from _search.scss / _input.scss. */
.dashboard-search {
	flex: 1;
	min-inline-size: 0;
	max-inline-size: 22rem;
	margin-inline-end: auto;
}

.dashboard-search input {
	inline-size: 100%;
}

/* Topbar action toolbar — tighter gap than <menu> default (0.5rem) for
 * an icon-button cluster. */
.dashboard-actions {
	gap: 0.25rem;
}

/* Range toolbar — buttons butt up with zero gap; active state weight. */
.dashboard-range {
	gap: 0;
}

.dashboard-range button.active {
	font-weight: 600;
	color: var(--color-text);
}

/* Stats grid — auto-fit with minmax for natural wrap on narrow
 * viewports. Tailwind needs an arbitrary value to express this. */
.dashboard-stats {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
	gap: 1rem;
}

.dashboard-stat-value {
	margin: 0;
	font-size: 1.75rem;
	font-weight: 700;
}

.dashboard-stat-delta {
	margin: 0;
	display: inline-flex;
	align-items: center;
	gap: 0.375rem;
	font-size: 0.8125rem;
}

.dashboard-stat-delta[data-trend='up'] {
	color: var(--color-success-text-emphasis);
}
.dashboard-stat-delta[data-trend='down'] {
	color: var(--color-danger-text-emphasis);
}
.dashboard-stat-delta[data-trend='flat'] {
	color: var(--color-text-subtle);
}

/* Chart/Quick-actions row — 2:1 above 1024px, stacked below. */
.dashboard-chart-row {
	display: grid;
	grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
	gap: 1rem;
}

@media (max-width: 1024px) {
	.dashboard-chart-row {
		grid-template-columns: minmax(0, 1fr);
	}
}

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
