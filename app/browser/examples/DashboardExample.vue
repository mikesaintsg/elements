<script lang="ts" setup>
/**
 * DashboardExample — semantic-first port of mailbox's DashboardExample.
 *
 * Layout intent (preserved from mailbox):
 *   - Persistent left sidebar above 768px; offcanvas drawer below.
 *   - Topbar with search + action menu; collapses to a hamburger drawer
 *     below 768px.
 *   - Stat cards row, then revenue chart + quick-actions side-by-side,
 *     then a recent-activity timeline.
 *
 * Translation rules (per the spec):
 *   - `.btn-primary` / `.btn-secondary` → bare <button class="primary|subtle">.
 *   - `.btn-group[role=toolbar]` → <menu role="toolbar">.
 *   - `.offcanvas-md offcanvas-start` → <aside :popover>.
 *   - `.modal` would be → <dialog> + useDialog (none used in Dashboard).
 *   - `.bi bi-*` → <i class="icon" style="--icon: var(--set-icon-X)">.
 *   - `.card` → <article>. `.card-header/body/footer` → <header>/<div>/<footer>
 *     inside <article>.
 *   - `.timeline-item` → <li> in an <ol>; status uses <small class="tag X">.
 *   - `.stat-delta-*` → scoped CSS (presentation-only, not framework chrome).
 */
import { computed, onMounted, onUnmounted, ref, useTemplateRef } from 'vue'
import { useAside } from '@elements/browser'

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

// Mobile drawer breakpoint — mirrors the existing App.vue pattern of
// toggling the popover attribute below 960px. Dashboard uses 768px so
// stat cards have room to break to two columns before the sidebar
// dissolves.
const MOBILE_QUERY = '(max-width: 767.98px)'
const isMobile = ref(false)
const mobileMq = typeof window !== 'undefined' ? window.matchMedia(MOBILE_QUERY) : null
const syncMobile = (): void => {
	isMobile.value = mobileMq?.matches ?? false
}

// Sidebar drawer — `useAside` upgrades the <aside popover> into a
// slide-from-edge drawer when the popover attribute is set (mobile).
const sidebarRef = useTemplateRef<HTMLElement>('sidebarRef')
// useAside attaches the beforetoggle/toggle bridge and onCleanup-driven
// destroy(); the return value isn't referenced here because the popover
// is driven by native popovertarget buttons and the :popover binding.
const sidebar = useAside(sidebarRef, { popover: false })

// Compute a chart-bar height for the demo SVG. Deterministic (no rng)
// so screenshots are reproducible.
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
	<!-- Outer shell — two-column grid (sidebar | main) on desktop,
	     single column on mobile once the aside promotes to a popover drawer.
	     Tailwind grid with an arbitrary sidebar-column value. -->
	<div class="dashboard-shell">
		<!-- ── Sidebar ────────────────────────────────────────────────
		     <aside> as a body-shell-style rail. Above 768px it's an
		     in-flow grid column; below 768px the `:popover` binding
		     promotes it to a drawer via the framework's
		     `aside[popover]` chrome. The `.start` placement modifier
		     is load-bearing in two contexts: in the drawer (mobile)
		     it slides in from the inline-start edge (left in LTR) —
		     conventional sidebar position. In-flow (desktop) it flips
		     the aside's default border from inline-start to inline-end
		     (correct, since this aside sits to the LEFT of main, so
		     the divider belongs on its right). -->
		<aside
			id="dashboard-sidebar"
			ref="sidebarRef"
			class="dashboard-sidebar start"
			:popover="isMobile ? 'auto' : undefined"
			aria-label="Primary navigation"
		>
			<!-- Brand strip — flex row, pinned top. Not a body-level header so
			     framework header chrome doesn't auto-apply; manual classes carry
			     the chrome. -->
			<header class="dashboard-sidebar-brand">
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
			<!-- Nav takes remaining space, scrolls if content overflows. -->
			<nav class="flex-1 overflow-y-auto p-2" aria-label="Workspace">
				<menu>
					<li>
						<a href="#" aria-current="page">
							<!-- TODO icon swap — information stands in for missing 'speedometer' (overview/dashboard) -->
							<i class="icon" aria-hidden="true" style="--icon: var(--set-icon-information)"></i>
							Overview
						</a>
					</li>
					<li>
						<a href="#">
							<!-- TODO icon swap — sort stands in for missing 'bar-chart' (analytics) -->
							<i class="icon" aria-hidden="true" style="--icon: var(--set-icon-sort)"></i>
							Analytics
						</a>
					</li>
					<li>
						<a href="#">
							<!-- TODO icon swap — more stands in for missing 'people' (customers) -->
							<i class="icon" aria-hidden="true" style="--icon: var(--set-icon-more)"></i>
							Customers
						</a>
					</li>
					<li>
						<a href="#">
							<!-- TODO icon swap — minus stands in for missing 'receipt' (invoices) -->
							<i class="icon" aria-hidden="true" style="--icon: var(--set-icon-minus)"></i>
							Invoices
						</a>
					</li>
					<li>
						<a href="#">
							<!-- TODO icon swap — system stands in for missing 'gear' (settings) -->
							<i class="icon" aria-hidden="true" style="--icon: var(--set-icon-system)"></i>
							Settings
						</a>
					</li>
				</menu>
				<!-- Section label — eyebrow caps, tight margin below per _menu.scss guide -->
				<h6 class="dashboard-nav-section-label">Workspaces</h6>
				<menu>
					<li>
						<a href="#" class="dashboard-workspace">
							<!-- Circular initials badge — no framework <badge> for circle shape;
							     scoped .mark class is the minimal custom primitive. -->
							<span class="mark" aria-hidden="true">A</span>
							Acme Inc
						</a>
					</li>
					<li>
						<a href="#" class="dashboard-workspace">
							<span class="mark" aria-hidden="true">B</span>
							Buena Vista
						</a>
					</li>
				</menu>
			</nav>
			<!-- Account footer — pinned bottom of sidebar. Not a body-level aside
			     footer so framework footer chrome doesn't auto-apply. -->
			<footer class="dashboard-sidebar-account">
				<!-- Larger initials mark for the account row. -->
				<span class="mark account-mark" aria-hidden="true">MS</span>
				<span class="flex flex-col leading-tight">
					<strong>Mike Saint</strong>
					<small>mike@acme.dev</small>
				</span>
			</footer>
		</aside>

		<!-- ── Main column ─────────────────────────────────────────── -->
		<div class="flex flex-col min-w-0 overflow-hidden">
			<!-- Topbar — not a body-level header so framework header chrome
			     doesn't auto-apply; manual flex chrome via scoped class. -->
			<header class="dashboard-topbar">
				<button
					v-if="isMobile"
					type="button"
					class="subtle compact"
					aria-label="Open menu"
					popovertarget="dashboard-sidebar"
				>
					<i class="icon" aria-hidden="true" style="--icon: var(--set-icon-menu)"></i>
				</button>
				<!-- Search — hidden below md (mobile: hamburger + actions only,
				     to keep the topbar uncrowded). On md+, <form role="search">
				     + <input type="search"> get framework chrome from
				     _search.scss / _input.scss; the scoped class adds a
				     max-width cap. -->
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
						<!-- Primary CTA — label hides below md, icon-only on mobile. -->
						<button type="button" class="primary">
							<i class="icon" aria-hidden="true" style="--icon: var(--set-icon-plus)"></i>
							<span class="hidden md:inline">New invoice</span>
						</button>
					</li>
					<!-- Secondary actions — hidden below md. Below that breakpoint the
					     drawer carries primary navigation; the topbar action rail
					     keeps only New invoice + Notifications so the row breathes. -->
					<li role="none" class="hidden md:contents">
						<!-- TODO icon swap — sort stands in for missing 'refresh' (reload/sync) -->
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
						<!-- TODO icon swap — information stands in for missing 'bell' (notifications) -->
						<button type="button" class="subtle compact" aria-label="Notifications">
							<i class="icon" aria-hidden="true" style="--icon: var(--set-icon-information)"></i>
						</button>
					</li>
				</menu>
			</header>

			<!-- Page-content padding: tight on mobile so the dashboard
			     reads like a normal app screen (edge-to-edge cards, less
			     wasted gutter), comfortable from sm up. Bottom padding
			     stays generous on mobile so the floating ExamplesShell
			     toolbar (bottom-center on narrow viewports) never
			     permanently obscures the tail of the scroll content. -->
			<main class="flex-1 overflow-y-auto p-4 pb-28 sm:p-6 sm:pb-6 flex flex-col gap-4 sm:gap-6">
				<!-- Page header — flex row wrapping, space between hgroup and range
				     toolbar. Tailwind utilities handle the layout. -->
				<header class="flex flex-wrap justify-between items-end gap-4">
					<hgroup>
						<!-- Eyebrow — small caps label above the page title. Tailwind for
						     typography; var(--color-text-subtle) via a CSS var inline. -->
						<p class="m-0 text-xs uppercase tracking-wide" style="color: var(--color-text-subtle)">
							Overview
						</p>
						<h1 class="my-1 text-2xl">Welcome back, Mike</h1>
						<p>Here's what's happened across your workspace this {{ range }}.</p>
					</hgroup>
					<!-- Range toolbar — gap: 0 so buttons butt up with no gap between them.
					     <menu> baseline already strips list-style/margin/padding/flex; only
					     the gap override is needed (scoped .dashboard-range). -->
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

				<!-- Stat cards — auto-fit grid so cards wrap to new rows on narrow
				     viewports. <article> provides card chrome (border, radius, shadow,
				     flex-col, padding, gap). The padding override (.small modifier or
				     inline token) tightens the card for dense stat data. -->
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

				<!-- Chart + Quick actions row — 2:1 grid on ≥1024px, stacked below.
				     Responsive breakpoint needs arbitrary column values so a scoped
				     class is the cleanest option. -->
				<section class="dashboard-chart-row" aria-label="Revenue and quick actions">
					<!-- Revenue chart card — <article> gives border/radius/shadow/flex-col.
					     The scoped .dashboard-chart-card / .dashboard-actions-card classes
					     are removed; article baseline is sufficient. -->
					<article>
						<header>
							<hgroup>
								<h2>Revenue trajectory</h2>
								<p>Daily gross, cohort-adjusted</p>
							</hgroup>
							<!-- Legend — inline-flex list. .dot primitive for the color swatch. -->
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

					<!-- Quick actions card — <article> gives card chrome. The <menu> inside
					     article gets flex-direction: row + justify-end from the framework's
					     article menu rule, but we need column layout here. Scoped override
					     on .dashboard-actions-menu. -->
					<article>
						<header>
							<h2>Quick actions</h2>
						</header>
						<menu class="dashboard-actions-menu">
							<li>
								<!-- TODO icon swap — plus stands in for missing 'person-plus' (invite teammate) -->
								<button type="button" class="subtle w-full justify-start text-start">
									<i class="icon" aria-hidden="true" style="--icon: var(--set-icon-plus)"></i>
									Invite a teammate
								</button>
							</li>
							<li>
								<!-- TODO icon swap — minus stands in for missing 'receipt' (draft invoice) -->
								<button type="button" class="subtle w-full justify-start text-start">
									<i class="icon" aria-hidden="true" style="--icon: var(--set-icon-minus)"></i>
									Draft an invoice
								</button>
							</li>
							<li>
								<!-- TODO icon swap — external stands in for missing 'cloud-upload' (import) -->
								<button type="button" class="subtle w-full justify-start text-start">
									<i class="icon" aria-hidden="true" style="--icon: var(--set-icon-external)"></i>
									Import customers
								</button>
							</li>
							<li>
								<!-- TODO icon swap — success stands in for missing 'shield-check' (security audit) -->
								<button type="button" class="subtle w-full justify-start text-start">
									<i class="icon" aria-hidden="true" style="--icon: var(--set-icon-success)"></i>
									Run a security audit
								</button>
							</li>
							<li>
								<!-- TODO icon swap — information stands in for missing 'life-preserver' (support) -->
								<button type="button" class="subtle w-full justify-start text-start">
									<i
										class="icon"
										aria-hidden="true"
										style="--icon: var(--set-icon-information)"
									></i>
									Contact support
								</button>
							</li>
						</menu>
					</article>
				</section>

				<!-- Activity timeline. <ol> for ordered events; <time> for
				     the timestamp; <small class="tag X"> for status. -->
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
							<!-- Timeline marker — .dot primitive positions on the rail line.
							     The absolute placement + rail offset is geometry the framework
							     doesn't own; kept as scoped selectors on .dashboard-timeline. -->
							<span class="dashboard-timeline-marker dot" aria-hidden="true"></span>
							<div class="flex flex-wrap items-baseline gap-2 ml-4">
								<p class="m-0 flex flex-wrap items-baseline gap-2">
									<strong>{{ row.who }}</strong>
									<span>{{ row.action }}</span>
									<code class="text-sm">{{ row.target }}</code>
									<small class="tag ms-auto" :class="statusVariant[row.status]">{{
										row.status
									}}</small>
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
		</div>
	</div>
</template>

<style scoped>
/* ── Layout glue that the framework can't own ─────────────────────────────
 *
 * The framework's aside/header chrome selectors are scoped to the body-
 * layout-shell context (`body:has(main) > aside`, etc.). The dashboard's
 * <aside> and <header> elements are nested inside a scoped <div>, not
 * directly under <body>, so none of that chrome auto-applies here. These
 * scoped rules supply the missing chrome while staying minimal — only the
 * properties that Tailwind utilities or framework baselines don't already
 * provide.
 *
 * Scoped rules are grouped by concern. Each rule carries a one-line
 * rationale so future readers know whether it can be removed once the
 * framework adds the corresponding primitive.
 * ──────────────────────────────────────────────────────────────────────── */

/* Outer shell grid — two-column (sidebar | main) on ≥768px.
 * Tailwind `grid-cols-[auto_minmax(0,1fr)]` is an arbitrary value that
 * isn't in the default Tailwind scale; scoped rule avoids a JIT
 * arbitrary token on the root element. */
.dashboard-shell {
	display: grid;
	grid-template-columns: auto minmax(0, 1fr);
	block-size: 100dvh;
	overflow: hidden;
	background: var(--color-canvas);
}

@media (max-width: 767.98px) {
	/* On mobile the aside is a popover drawer (out of flow), so the grid
	 * collapses to a single full-width column. */
	.dashboard-shell {
		grid-template-columns: minmax(0, 1fr);
	}
}

/* ── Sidebar ─────────────────────────────────────────────────────────── */

/* Sidebar rail — framework aside chrome is body-level only; manual chrome
 * here. .start class already on the aside flips the border edge (handled
 * by framework's aside[popover].start rule for drawer mode).
 *
 * Drawer-mode padding override: the framework's <aside popover> chrome
 * adds `--set-aside-drawer-padding-inline: calc(spacing * 4) = 16px` to
 * the drawer container, designed for content drawers (forms, callouts)
 * where a body gutter helps. For a sidebar-style drawer the inner items
 * already own their own padding-inline; the extra 16px just steals
 * width from the link rows on mobile. Reset to 0 so the nav rail can
 * use the drawer's full width. Same trick on `.showcase-sidebar` in
 * showcase.css for the docs shell. */
.dashboard-sidebar {
	inline-size: 16rem;
	display: flex;
	flex-direction: column;
	border-inline-end: 1px solid var(--color-border);
	background: var(--color-surface);
	overflow: hidden;
	--set-aside-drawer-padding-inline: 0;
}

/* Brand strip — framework header chrome is body-level only; manual flex
 * band. min-block-size matches the topbar so both rows align horizontally
 * across the layout on desktop. */
.dashboard-sidebar-brand {
	display: flex;
	align-items: center;
	gap: 0.5rem;
	padding: 0 1rem;
	min-block-size: 3.5rem;
	border-block-end: 1px solid var(--color-border);
	flex-shrink: 0;
}

/* Sidebar nav menu — framework's nav-rail column chrome
 * (`body:has(main) > nav menu { flex-direction: column }`) only matches
 * body-level nav rails. The dashboard's <nav> is nested inside <aside>
 * inside the dashboard shell, so the selector misses and the menu
 * inherits the bare `<menu>` baseline (`display: flex; flex-wrap: wrap`
 * — a horizontal toolbar). Force the column layout here so links stack
 * vertically as a sidebar should.
 *
 * The <li> children get `display: contents` from the framework menu
 * baseline, so the immediate flex children are the <a>/<button>s — they
 * lay out directly in the menu's flex column. */
.dashboard-sidebar nav menu {
	flex-direction: column;
	flex-wrap: nowrap;
	align-items: stretch;
	gap: 0.125rem;
}

/* Nav-rail link/button chrome — same reasoning: the framework's
 * `body:has(main) > nav menu > li > :where(a, button)` rules only apply
 * to body-level nav rails. Replicate the essential nav-command look
 * here so links read as quiet, full-width, start-aligned commands with
 * a hover affordance and an active-page state. */
.dashboard-sidebar nav menu > li > :where(a, button) {
	display: flex;
	align-items: center;
	gap: 0.5rem;
	inline-size: 100%;
	padding: 0.4rem 0.625rem;
	border: 0;
	border-radius: 0.375rem;
	background-color: transparent;
	color: var(--color-text);
	text-align: start;
	text-decoration: none;
	font-size: inherit;
	font-weight: 400;
	cursor: pointer;
}

.dashboard-sidebar nav menu > li > :where(a, button):hover {
	background-color: var(--color-surface-tertiary, var(--color-surface));
}

.dashboard-sidebar nav menu > li > a[aria-current='page'] {
	background-color: var(--color-surface-tertiary, var(--color-surface));
	font-weight: 600;
}

/* Section heading in the nav — small caps label above a menu group.
 * Not a framework token; kept scoped because nav-section labels are
 * presentation chrome specific to this example's sidebar shape. */
.dashboard-nav-section-label {
	margin: 1.5rem 0 0.25rem;
	padding-inline: 0.625rem;
	font-size: 0.6875rem;
	text-transform: uppercase;
	letter-spacing: 0.04em;
	color: var(--color-text-subtle);
}

/* Workspace link — needs inline-flex for the mark + label pair. */
.dashboard-workspace {
	display: inline-flex;
	align-items: center;
	gap: 0.5rem;
}

/* Circular initials badge — no framework element maps to "filled circle
 * with initials text." Shared between workspace links and the account
 * footer. Kept as one scoped class. */
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

/* Account mark is slightly larger than workspace marks. */
.account-mark {
	inline-size: 2rem;
	block-size: 2rem;
}

/* Account footer — framework footer chrome is body-level only; manual
 * flex band pinned to the sidebar bottom.
 *
 * `justify-content: flex-start` overrides the framework's drawer footer
 * rule (`:is(aside, nav)[popover] > footer:last-child` in
 * components/_aside.scss) which sets `justify-content: flex-end` — that
 * default is intended for trailing-action rows (Cancel | Save). This
 * footer is an account info display where content should sit at the
 * inline-start edge alongside the mark. */
.dashboard-sidebar-account {
	display: flex;
	align-items: center;
	justify-content: flex-start;
	gap: 0.5rem;
	padding: 0.75rem 1rem;
	border-block-start: 1px solid var(--color-border);
	flex-shrink: 0;
}

/* ── Topbar ──────────────────────────────────────────────────────────── */

/* Topbar — framework header chrome is body-level only; manual flex band.
 * min-block-size aligns with the sidebar brand strip. */
.dashboard-topbar {
	display: flex;
	align-items: center;
	gap: 0.5rem;
	padding-inline: 1rem;
	min-block-size: 3.5rem;
	border-block-end: 1px solid var(--color-border);
	background: var(--color-surface);
	flex-shrink: 0;
}

/* Search form — flex-grow to fill available space; max-width cap keeps
 * it readable; margin-inline-end: auto pushes the actions menu right.
 * <form role="search"> + <input type="search"> get framework chrome from
 * _search.scss / _input.scss; only the layout sizing is scoped here. */
.dashboard-search {
	flex: 1;
	min-inline-size: 0;
	max-inline-size: 22rem;
	margin-inline-end: auto;
}

.dashboard-search input {
	inline-size: 100%;
}

/* Actions toolbar — <menu> baseline has gap: var(--spacing)*2 = 0.5rem.
 * Dashboard uses tighter 0.25rem gap for icon-only button clusters. */
.dashboard-actions {
	gap: 0.25rem;
}

/* ── Content area controls ───────────────────────────────────────────── */

/* Range toolbar — gap: 0 so buttons butt up; active state weight.
 * <menu> baseline already strips list-style/margin/padding/flex. */
.dashboard-range {
	gap: 0;
}

.dashboard-range button.active {
	font-weight: 600;
	color: var(--color-text);
}

/* ── Stat cards ──────────────────────────────────────────────────────── */

/* Stats grid — auto-fit with minmax so cards wrap naturally on narrow
 * viewports. Tailwind can't express auto-fit + minmax without an
 * arbitrary value on the element; scoped rule is cleaner. */
.dashboard-stats {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
	gap: 1rem;
}

/* Stat value — headline number. Large + bold; no framework typography
 * token maps to this specific size. */
.dashboard-stat-value {
	margin: 0;
	font-size: 1.75rem;
	font-weight: 700;
}

/* Stat delta — trend indicator row. Color driven by data-trend attribute
 * so the three states (up/down/flat) share one rule set instead of three
 * classes. Uses semantic color tokens from _theme.scss. */
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

/* ── Chart + Quick-actions row ───────────────────────────────────────── */

/* Chart/actions row — 2:1 ratio grid on ≥1024px, stacked below. The
 * arbitrary column sizes can't be expressed in Tailwind without the JIT
 * arbitrary-value syntax on every breakpoint; scoped rule is cleaner. */
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

/* SVG chart — block + w-full are Tailwind utilities applied inline;
 * block-size is an arbitrary value that doesn't map to a Tailwind
 * default scale step, so it stays scoped. */
.dashboard-chart {
	block-size: 14rem;
}

/* SVG rect fill — SVG presentation attributes can't be set via Tailwind
 * utility classes; scoped CSS is the only clean option here. */
.dashboard-chart rect {
	fill: var(--color-primary, oklch(60% 0.15 250));
	opacity: 0.45;
}

.dashboard-chart rect[data-highlight] {
	fill: var(--color-information, oklch(70% 0.15 220));
	opacity: 0.85;
}

/* Quick-actions menu — framework's `article menu` rule sets justify-end
 * (horizontal row trailing-edge layout). The actions panel needs a
 * vertical column instead; this single override corrects the direction. */
.dashboard-actions-menu {
	flex-direction: column;
	align-items: stretch;
}

/* ── Activity timeline ───────────────────────────────────────────────── */

/* Timeline rail — vertical list with a left border as the rail line.
 * The framework doesn't ship a timeline primitive; this is genuinely
 * custom layout glue. */
.dashboard-timeline {
	margin: 0;
	padding: 0;
	list-style: none;
	border-inline-start: 2px solid var(--color-border);
	padding-inline-start: 1.5rem;
}

/* Timeline marker — uses the .dot framework primitive for the circle
 * shape (framework provides size, border-radius, bg-color, flex-shrink).
 * Absolute positioning onto the rail line is geometry the framework
 * doesn't own; kept as scoped rules on .dashboard-timeline-marker. */
.dashboard-timeline-marker {
	position: absolute;
	inset-inline-start: calc(-1.5rem - 0.4rem - 1px);
	inset-block-start: 0.875rem;
	/* Override .dot's default 0.5rem with a slightly larger dot that reads
	 * clearly against the rail line. */
	--set-dot-size: 0.8rem;
	background: var(--color-surface);
	box-shadow: 0 0 0 2px currentColor;
	color: var(--color-text-subtle);
}

/* Status-based dot color — drives both currentColor (the outline ring
 * via box-shadow) and the .dot background-color via --set-dot-background-
 * color override. Uses framework semantic color tokens. */
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
